import { NextResponse } from "next/server";
import { z } from "zod";

import { getUserRole } from "@/lib/auth/admin-access";
import { hasAdminAreaAccess } from "@/lib/auth/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const strictSlugSchema = z
  .string()
  .trim()
  .regex(slugPattern, "Must be a lowercase slug.");

const saveDraftSchema = z
  .object({
    action: z.literal("save_draft"),
    data: z
      .object({
        existingTopicSlugs: z.array(strictSlugSchema).default([]),
        createTopic: z
          .object({
            enabled: z.boolean().default(false),
            slug: z.string().default(""),
            name: z.string().default(""),
            shortDescription: z.string().default(""),
            overviewMarkdown: z.string().default(""),
            sortOrder: z.number().int().min(0).max(100000).default(0),
            subcategorySlug: z.string().default(""),
            publishNow: z.boolean().default(true),
          })
          .strict()
          .default({
            enabled: false,
            slug: "",
            name: "",
            shortDescription: "",
            overviewMarkdown: "",
            sortOrder: 0,
            subcategorySlug: "",
            publishNow: true,
          }),
        question: z
          .object({
            slug: z.string().default(""),
            title: z.string().trim().min(1),
            summary: z.string().trim().min(1),
          })
          .strict(),
        answer: z
          .object({
            title: z.string().default(""),
            contentMarkdown: z.string().trim().min(1),
          })
          .strict(),
      })
      .strict(),
  })
  .strict()
  .superRefine((payload, ctx) => {
    const createTopic = payload.data.createTopic;

    if (createTopic.enabled) {
      if (!createTopic.name.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Topic name is required when creating a topic.",
          path: ["data", "createTopic", "name"],
        });
      }

      if (!createTopic.shortDescription.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Topic short description is required when creating a topic.",
          path: ["data", "createTopic", "shortDescription"],
        });
      }

      if (!createTopic.subcategorySlug.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Topic subcategory is required when creating a topic.",
          path: ["data", "createTopic", "subcategorySlug"],
        });
      }
    }
  });

const publishSchema = z
  .object({
    action: z.literal("publish"),
    data: z
      .object({
        questionSlug: strictSlugSchema,
      })
      .strict(),
  })
  .strict();

const contentPackageSchema = z.union([saveDraftSchema, publishSchema]);

type CategoryRelation =
  | {
      slug: string | null;
      name: string | null;
    }
  | Array<{
      slug: string | null;
      name: string | null;
    }>;

type SubcategoryRelation =
  | {
      slug: string | null;
      name: string | null;
      categories: CategoryRelation | null;
    }
  | Array<{
      slug: string | null;
      name: string | null;
      categories: CategoryRelation | null;
    }>;

type TopicRow = {
  id: string;
  slug: string;
  name: string;
  status: string | null;
  subcategories: SubcategoryRelation | null;
};

type TopicDuplicateRow = {
  slug: string;
  name: string;
  status: string | null;
};

type SubcategoryRow = {
  id: string;
  slug: string;
  name: string;
  categories: CategoryRelation | null;
};

type QuestionRow = {
  id: string;
  slug: string;
  title: string;
  status: string | null;
};

type QuestionDuplicateRow = {
  slug: string;
  title: string;
  status: string | null;
};

type AnswerRow = {
  id: string;
  status: string | null;
};

function pickSingle<T>(value: T | T[] | null | undefined): T | null {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function normalizeOptionalText(value: string | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed || null;
}

function slugifyText(value: string, fallback = "untitled") {
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return normalized || fallback;
}

async function ensureUniqueSlug(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  table: "questions" | "topics",
  baseSlug: string,
) {
  let attempt = 0;
  let candidate = baseSlug;

  while (attempt < 200) {
    const { data, error } = await supabase
      .from(table)
      .select("id")
      .eq("slug", candidate)
      .limit(1);

    if (error) {
      throw new Error(
        `Unable to ensure unique slug for ${table}: ${error.message}`,
      );
    }

    if (!data || data.length === 0) {
      return candidate;
    }

    attempt += 1;
    candidate = `${baseSlug}-${attempt + 1}`;
  }

  throw new Error(
    `Unable to generate unique slug for ${table} from "${baseSlug}".`,
  );
}

function formatQuestionDuplicateWarning(rows: QuestionDuplicateRow[]) {
  if (!rows.length) {
    return null;
  }

  const examples = rows
    .slice(0, 3)
    .map((row) => `${row.slug} (${row.status ?? "draft"})`)
    .join(", ");

  return `Possible duplicate question title found: ${examples}.`;
}

function formatTopicDuplicateWarning(rows: TopicDuplicateRow[]) {
  if (!rows.length) {
    return null;
  }

  const examples = rows
    .slice(0, 3)
    .map((row) => `${row.slug} (${row.status ?? "draft"})`)
    .join(", ");

  return `Possible duplicate topic name found in selected subcategory: ${examples}.`;
}

function dedupeKeepOrder(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    if (seen.has(value)) {
      continue;
    }
    seen.add(value);
    result.push(value);
  }

  return result;
}

export async function POST(request: Request) {
  const parsed = contentPackageSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid content payload.",
      },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { error: "You must be signed in to perform this action." },
      { status: 401 },
    );
  }

  const role = await getUserRole(supabase, user.id);

  if (!hasAdminAreaAccess(role)) {
    return NextResponse.json(
      { error: "You need an admin or editor role to perform this action." },
      { status: 403 },
    );
  }

  if (parsed.data.action === "save_draft") {
    const nowIso = new Date().toISOString();
    const warnings: string[] = [];
    const questionInput = parsed.data.data.question;
    const answerInput = parsed.data.data.answer;
    const createTopicInput = parsed.data.data.createTopic;

    const normalizedExistingTopicSlugs = dedupeKeepOrder(
      parsed.data.data.existingTopicSlugs.map((slug) =>
        slug.trim().toLowerCase(),
      ),
    );

    const linkedTopicIdsOrdered: string[] = [];
    const linkedTopicSlugsOrdered: string[] = [];
    const linkedCategoryLabelsOrdered: string[] = [];

    if (normalizedExistingTopicSlugs.length) {
      const { data: existingTopicRows, error: existingTopicsError } =
        await supabase
          .from("topics")
          .select(
            "id, slug, name, status, subcategories(slug, name, categories(slug, name))",
          )
          .in("slug", normalizedExistingTopicSlugs)
          .returns<TopicRow[]>();

      if (existingTopicsError) {
        return NextResponse.json(
          {
            error: `Unable to load selected topics: ${existingTopicsError.message}`,
          },
          { status: 500 },
        );
      }

      const bySlug = new Map(
        ((existingTopicRows as TopicRow[] | null) ?? []).map((row) => [
          row.slug,
          row,
        ]),
      );

      for (const selectedSlug of normalizedExistingTopicSlugs) {
        const topic = bySlug.get(selectedSlug);
        if (!topic) {
          return NextResponse.json(
            {
              error: `Selected topic "${selectedSlug}" was not found.`,
            },
            { status: 400 },
          );
        }

        linkedTopicIdsOrdered.push(topic.id);
        linkedTopicSlugsOrdered.push(topic.slug);

        const subcategory = pickSingle(topic.subcategories);
        const category = pickSingle(subcategory?.categories);
        if (category?.name) {
          linkedCategoryLabelsOrdered.push(category.name);
        }

        if (topic.status !== "published") {
          warnings.push(
            `Selected topic "${topic.slug}" is currently ${topic.status ?? "draft"}. It will be published during question publish.`,
          );
        }
      }
    }

    if (createTopicInput.enabled) {
      const subcategorySlug = createTopicInput.subcategorySlug
        .trim()
        .toLowerCase();

      if (!slugPattern.test(subcategorySlug)) {
        return NextResponse.json(
          {
            error: "Topic subcategory slug is invalid.",
          },
          { status: 400 },
        );
      }

      const { data: subcategoryRow, error: subcategoryError } = await supabase
        .from("subcategories")
        .select("id, slug, name, categories(slug, name)")
        .eq("slug", subcategorySlug)
        .maybeSingle<SubcategoryRow>();

      if (subcategoryError) {
        return NextResponse.json(
          {
            error: `Unable to resolve topic subcategory: ${subcategoryError.message}`,
          },
          { status: 500 },
        );
      }

      if (!subcategoryRow) {
        return NextResponse.json(
          {
            error: `Subcategory "${subcategorySlug}" was not found.`,
          },
          { status: 400 },
        );
      }

      const subcategoryCategory = pickSingle(subcategoryRow.categories);

      const requestedTopicSlugRaw = createTopicInput.slug.trim().toLowerCase();
      const requestedTopicSlug = requestedTopicSlugRaw
        ? slugPattern.test(requestedTopicSlugRaw)
          ? requestedTopicSlugRaw
          : null
        : "";

      if (requestedTopicSlug === null) {
        return NextResponse.json(
          {
            error: "Provided topic slug is invalid.",
          },
          { status: 400 },
        );
      }

      let topicSlug = requestedTopicSlug;
      let autoGeneratedTopicSlug = false;

      if (!topicSlug) {
        topicSlug = await ensureUniqueSlug(
          supabase,
          "topics",
          slugifyText(createTopicInput.name, "topic"),
        );
        autoGeneratedTopicSlug = true;
      }

      const { data: duplicateTopicRows, error: duplicateTopicError } =
        await supabase
          .from("topics")
          .select("slug, name, status")
          .eq("subcategory_id", subcategoryRow.id)
          .ilike("name", createTopicInput.name)
          .neq("slug", topicSlug)
          .limit(5);

      if (duplicateTopicError) {
        return NextResponse.json(
          {
            error: `Unable to run topic duplication checks: ${duplicateTopicError.message}`,
          },
          { status: 500 },
        );
      }

      const topicDuplicateWarning = formatTopicDuplicateWarning(
        (duplicateTopicRows as TopicDuplicateRow[] | null) ?? [],
      );
      if (topicDuplicateWarning) {
        warnings.push(topicDuplicateWarning);
      }

      let createdTopicId: string | null = null;

      if (autoGeneratedTopicSlug) {
        const { data: insertedTopic, error: insertTopicError } = await supabase
          .from("topics")
          .insert({
            slug: topicSlug,
            name: createTopicInput.name.trim(),
            short_description: createTopicInput.shortDescription.trim(),
            overview_markdown: createTopicInput.overviewMarkdown,
            sort_order: createTopicInput.sortOrder,
            subcategory_id: subcategoryRow.id,
            status: createTopicInput.publishNow ? "published" : "draft",
            published_at: createTopicInput.publishNow ? nowIso : null,
            created_by: user.id,
            updated_by: user.id,
          })
          .select("id")
          .maybeSingle<{ id: string }>();

        if (insertTopicError || !insertedTopic) {
          return NextResponse.json(
            {
              error: `Unable to create topic: ${insertTopicError?.message ?? "Unknown error"}`,
            },
            { status: 500 },
          );
        }

        createdTopicId = insertedTopic.id;
      } else {
        const { data: existingTopic, error: existingTopicError } =
          await supabase
            .from("topics")
            .select("id, slug, status")
            .eq("slug", topicSlug)
            .maybeSingle<{
              id: string;
              slug: string;
              status: string | null;
            }>();

        if (existingTopicError) {
          return NextResponse.json(
            {
              error: `Unable to check topic slug availability: ${existingTopicError.message}`,
            },
            { status: 500 },
          );
        }

        if (existingTopic?.status === "published") {
          return NextResponse.json(
            {
              error:
                "Topic slug is already published. Select it from existing topics or use another slug.",
            },
            { status: 409 },
          );
        }

        if (existingTopic) {
          const { error: updateTopicError } = await supabase
            .from("topics")
            .update({
              name: createTopicInput.name.trim(),
              short_description: createTopicInput.shortDescription.trim(),
              overview_markdown: createTopicInput.overviewMarkdown,
              sort_order: createTopicInput.sortOrder,
              subcategory_id: subcategoryRow.id,
              status: createTopicInput.publishNow ? "published" : "draft",
              published_at: createTopicInput.publishNow ? nowIso : null,
              updated_by: user.id,
            })
            .eq("id", existingTopic.id);

          if (updateTopicError) {
            return NextResponse.json(
              {
                error: `Unable to update topic: ${updateTopicError.message}`,
              },
              { status: 500 },
            );
          }

          createdTopicId = existingTopic.id;
        } else {
          const { data: insertedTopic, error: insertTopicError } =
            await supabase
              .from("topics")
              .insert({
                slug: topicSlug,
                name: createTopicInput.name.trim(),
                short_description: createTopicInput.shortDescription.trim(),
                overview_markdown: createTopicInput.overviewMarkdown,
                sort_order: createTopicInput.sortOrder,
                subcategory_id: subcategoryRow.id,
                status: createTopicInput.publishNow ? "published" : "draft",
                published_at: createTopicInput.publishNow ? nowIso : null,
                created_by: user.id,
                updated_by: user.id,
              })
              .select("id")
              .maybeSingle<{ id: string }>();

          if (insertTopicError || !insertedTopic) {
            return NextResponse.json(
              {
                error: `Unable to create topic: ${insertTopicError?.message ?? "Unknown error"}`,
              },
              { status: 500 },
            );
          }

          createdTopicId = insertedTopic.id;
        }
      }

      if (!createdTopicId) {
        return NextResponse.json(
          {
            error: "Unable to resolve created topic ID.",
          },
          { status: 500 },
        );
      }

      linkedTopicIdsOrdered.push(createdTopicId);
      linkedTopicSlugsOrdered.push(topicSlug);
      if (subcategoryCategory?.name) {
        linkedCategoryLabelsOrdered.push(subcategoryCategory.name);
      }

      if (!createTopicInput.publishNow) {
        warnings.push(
          `Created topic "${topicSlug}" is draft. It will be published during question publish.`,
        );
      }
    }

    const finalTopicIds = dedupeKeepOrder(linkedTopicIdsOrdered);
    const finalTopicSlugs = dedupeKeepOrder(linkedTopicSlugsOrdered);
    const finalCategoryLabels = dedupeKeepOrder(linkedCategoryLabelsOrdered);

    if (!finalTopicIds.length) {
      return NextResponse.json(
        {
          error: "Link at least one topic before saving.",
        },
        { status: 400 },
      );
    }

    const requestedQuestionSlugRaw = questionInput.slug.trim().toLowerCase();
    let questionSlug = "";
    let autoGeneratedQuestionSlug = false;

    if (requestedQuestionSlugRaw) {
      if (!slugPattern.test(requestedQuestionSlugRaw)) {
        return NextResponse.json(
          {
            error: "Provided question slug is invalid.",
          },
          { status: 400 },
        );
      }
      questionSlug = requestedQuestionSlugRaw;
    } else {
      questionSlug = await ensureUniqueSlug(
        supabase,
        "questions",
        slugifyText(questionInput.title, "question"),
      );
      autoGeneratedQuestionSlug = true;
    }

    const { data: duplicateQuestionRows, error: duplicateQuestionError } =
      await supabase
        .from("questions")
        .select("slug, title, status")
        .ilike("title", questionInput.title)
        .neq("slug", questionSlug)
        .limit(5);

    if (duplicateQuestionError) {
      return NextResponse.json(
        {
          error: `Unable to run question duplication checks: ${duplicateQuestionError.message}`,
        },
        { status: 500 },
      );
    }

    const questionDuplicateWarning = formatQuestionDuplicateWarning(
      (duplicateQuestionRows as QuestionDuplicateRow[] | null) ?? [],
    );
    if (questionDuplicateWarning) {
      warnings.push(questionDuplicateWarning);
    }

    let questionId: string | null = null;

    if (autoGeneratedQuestionSlug) {
      const { data: insertedQuestion, error: insertQuestionError } =
        await supabase
          .from("questions")
          .insert({
            slug: questionSlug,
            title: questionInput.title.trim(),
            summary: questionInput.summary.trim(),
            status: "draft",
            created_by: user.id,
            updated_by: user.id,
          })
          .select("id")
          .maybeSingle<{ id: string }>();

      if (insertQuestionError || !insertedQuestion) {
        return NextResponse.json(
          {
            error: `Unable to create question draft: ${insertQuestionError?.message ?? "Unknown error"}`,
          },
          { status: 500 },
        );
      }

      questionId = insertedQuestion.id;
    } else {
      const { data: existingQuestion, error: existingQuestionError } =
        await supabase
          .from("questions")
          .select("id, slug, title, status")
          .eq("slug", questionSlug)
          .maybeSingle<QuestionRow>();

      if (existingQuestionError) {
        return NextResponse.json(
          {
            error: `Unable to check existing question: ${existingQuestionError.message}`,
          },
          { status: 500 },
        );
      }

      if (existingQuestion?.status === "published") {
        return NextResponse.json(
          {
            error:
              "Question slug is already published. Use a new custom slug or keep slug empty to auto-generate.",
          },
          { status: 409 },
        );
      }

      if (existingQuestion) {
        const { error: updateQuestionError } = await supabase
          .from("questions")
          .update({
            title: questionInput.title.trim(),
            summary: questionInput.summary.trim(),
            status: "draft",
            published_at: null,
            updated_by: user.id,
          })
          .eq("id", existingQuestion.id);

        if (updateQuestionError) {
          return NextResponse.json(
            {
              error: `Unable to update question draft: ${updateQuestionError.message}`,
            },
            { status: 500 },
          );
        }

        questionId = existingQuestion.id;
      } else {
        const { data: insertedQuestion, error: insertQuestionError } =
          await supabase
            .from("questions")
            .insert({
              slug: questionSlug,
              title: questionInput.title.trim(),
              summary: questionInput.summary.trim(),
              status: "draft",
              created_by: user.id,
              updated_by: user.id,
            })
            .select("id")
            .maybeSingle<{ id: string }>();

        if (insertQuestionError || !insertedQuestion) {
          return NextResponse.json(
            {
              error: `Unable to create question draft: ${insertQuestionError?.message ?? "Unknown error"}`,
            },
            { status: 500 },
          );
        }

        questionId = insertedQuestion.id;
      }
    }

    if (!questionId) {
      return NextResponse.json(
        {
          error: "Unable to resolve question ID.",
        },
        { status: 500 },
      );
    }

    const { error: deleteQuestionTopicsError } = await supabase
      .from("question_topics")
      .delete()
      .eq("question_id", questionId);

    if (deleteQuestionTopicsError) {
      return NextResponse.json(
        {
          error: `Unable to reset question-topic links: ${deleteQuestionTopicsError.message}`,
        },
        { status: 500 },
      );
    }

    const questionTopicRows = finalTopicIds.map((topicId, index) => ({
      question_id: questionId,
      topic_id: topicId,
      sort_order: (index + 1) * 10,
      created_by: user.id,
      updated_by: user.id,
    }));

    const { error: insertQuestionTopicsError } = await supabase
      .from("question_topics")
      .insert(questionTopicRows);

    if (insertQuestionTopicsError) {
      return NextResponse.json(
        {
          error: `Unable to save question-topic links: ${insertQuestionTopicsError.message}`,
        },
        { status: 500 },
      );
    }

    const { data: primaryAnswer, error: primaryAnswerError } = await supabase
      .from("answers")
      .select("id, status")
      .eq("question_id", questionId)
      .eq("is_primary", true)
      .maybeSingle<AnswerRow>();

    if (primaryAnswerError) {
      return NextResponse.json(
        {
          error: `Unable to check existing primary answer: ${primaryAnswerError.message}`,
        },
        { status: 500 },
      );
    }

    if (primaryAnswer?.status === "published") {
      return NextResponse.json(
        {
          error:
            "Primary answer is already published. Use another question slug or keep slug empty for auto-generated drafts.",
        },
        { status: 409 },
      );
    }

    if (primaryAnswer) {
      const { error: updateAnswerError } = await supabase
        .from("answers")
        .update({
          title: normalizeOptionalText(answerInput.title),
          content_markdown: answerInput.contentMarkdown,
          status: "draft",
          published_at: null,
          updated_by: user.id,
        })
        .eq("id", primaryAnswer.id);

      if (updateAnswerError) {
        return NextResponse.json(
          {
            error: `Unable to update answer draft: ${updateAnswerError.message}`,
          },
          { status: 500 },
        );
      }
    } else {
      const { error: insertAnswerError } = await supabase
        .from("answers")
        .insert({
          question_id: questionId,
          title: normalizeOptionalText(answerInput.title),
          content_markdown: answerInput.contentMarkdown,
          is_primary: true,
          status: "draft",
          created_by: user.id,
          updated_by: user.id,
        });

      if (insertAnswerError) {
        return NextResponse.json(
          {
            error: `Unable to create answer draft: ${insertAnswerError.message}`,
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({
      ok: true,
      warnings,
      draft: {
        questionSlug,
        topicSlugs: finalTopicSlugs,
        categoryLabels: finalCategoryLabels,
      },
      previewUrl: `/admin/questions/preview/${questionSlug}`,
      publishPayload: {
        questionSlug,
      },
    });
  }

  const questionSlug = parsed.data.data.questionSlug;
  const publishTimestamp = new Date().toISOString();
  const warnings: string[] = [];

  const { data: questionRow, error: questionError } = await supabase
    .from("questions")
    .select("id, slug, title, status")
    .eq("slug", questionSlug)
    .maybeSingle<QuestionRow>();

  if (questionError || !questionRow) {
    return NextResponse.json(
      {
        error: `Unable to find question by slug: ${questionError?.message ?? "Not found"}`,
      },
      { status: 404 },
    );
  }

  const { data: duplicatePublishedRows, error: duplicatePublishedError } =
    await supabase
      .from("questions")
      .select("slug, title, status")
      .eq("status", "published")
      .ilike("title", questionRow.title)
      .neq("slug", questionRow.slug)
      .limit(5);

  if (duplicatePublishedError) {
    return NextResponse.json(
      {
        error: `Unable to run publish duplicate checks: ${duplicatePublishedError.message}`,
      },
      { status: 500 },
    );
  }

  const publishDuplicateWarning = formatQuestionDuplicateWarning(
    (duplicatePublishedRows as QuestionDuplicateRow[] | null) ?? [],
  );
  if (publishDuplicateWarning) {
    warnings.push(publishDuplicateWarning);
  }

  const { data: questionTopicRows, error: questionTopicError } = await supabase
    .from("question_topics")
    .select("topic_id")
    .eq("question_id", questionRow.id);

  if (questionTopicError) {
    return NextResponse.json(
      {
        error: `Unable to load question topics: ${questionTopicError.message}`,
      },
      { status: 500 },
    );
  }

  const topicIds = dedupeKeepOrder(
    (questionTopicRows ?? [])
      .map((row) => row.topic_id)
      .filter(Boolean) as string[],
  );

  if (!topicIds.length) {
    return NextResponse.json(
      {
        error:
          "Cannot publish without at least one linked topic. Save draft with linked topics first.",
      },
      { status: 400 },
    );
  }

  const { data: primaryAnswer, error: primaryAnswerError } = await supabase
    .from("answers")
    .select("id, status")
    .eq("question_id", questionRow.id)
    .eq("is_primary", true)
    .maybeSingle<AnswerRow>();

  if (primaryAnswerError || !primaryAnswer) {
    return NextResponse.json(
      {
        error: `Unable to find a primary answer before publishing: ${primaryAnswerError?.message ?? "Missing primary answer"}`,
      },
      { status: 400 },
    );
  }

  const { error: publishTopicsError } = await supabase
    .from("topics")
    .update({
      status: "published",
      published_at: publishTimestamp,
      updated_by: user.id,
    })
    .in("id", topicIds)
    .neq("status", "published");

  if (publishTopicsError) {
    return NextResponse.json(
      {
        error: `Unable to publish linked topics: ${publishTopicsError.message}`,
      },
      { status: 500 },
    );
  }

  const { error: publishAnswerError } = await supabase
    .from("answers")
    .update({
      status: "published",
      published_at: publishTimestamp,
      updated_by: user.id,
    })
    .eq("id", primaryAnswer.id)
    .neq("status", "published");

  if (publishAnswerError) {
    return NextResponse.json(
      {
        error: `Unable to publish primary answer: ${publishAnswerError.message}`,
      },
      { status: 500 },
    );
  }

  const { error: publishQuestionError } = await supabase
    .from("questions")
    .update({
      status: "published",
      published_at: publishTimestamp,
      updated_by: user.id,
    })
    .eq("id", questionRow.id)
    .neq("status", "published");

  if (publishQuestionError) {
    return NextResponse.json(
      {
        error: `Unable to publish question: ${publishQuestionError.message}`,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    warnings,
    published: {
      questionSlug,
    },
    previewUrl: `/admin/questions/preview/${questionSlug}`,
    publicUrl: `/questions/${questionSlug}`,
  });
}
