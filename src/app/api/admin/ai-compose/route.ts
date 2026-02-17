import { NextResponse } from "next/server";
import { z } from "zod";

import { getUserRole } from "@/lib/auth/admin-access";
import { hasAdminAreaAccess } from "@/lib/auth/roles";
import { resolveTemplatePrompt } from "@/lib/ai/answer-templates";
import { canUseOpenAi, createOpenAiChatCompletion } from "@/lib/ai/openai";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { dedupeKeepOrder, pickSingle } from "@/lib/utils";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const strictSlugSchema = z
  .string()
  .trim()
  .regex(slugPattern, "Must be a lowercase slug.");

const questionTypeSchema = z.enum(["standard", "scenario", "code_review"]);
const seniorityLevelSchema = z.enum([
  "junior",
  "mid",
  "senior",
  "lead",
  "architect",
]);

const suggestTopicsSchema = z
  .object({
    action: z.literal("suggest_topics"),
    data: z
      .object({
        questionTitle: z.string().trim().min(5),
        subcategorySlug: z.string().trim().default(""),
        limit: z.number().int().min(1).max(5).default(3),
      })
      .strict(),
  })
  .strict();

const resolveTemplateSchema = z
  .object({
    action: z.literal("resolve_template"),
    data: z
      .object({
        domain: z.string().trim().default("Salesforce"),
        questionTitle: z.string().trim().min(1),
        questionType: questionTypeSchema,
        seniorityLevel: seniorityLevelSchema,
        topicName: z.string().trim().default("General Topic"),
        subcategoryName: z.string().trim().default("General"),
        codeSnippet: z.string().default(""),
      })
      .strict(),
  })
  .strict();

const generateAnswerSchema = z
  .object({
    action: z.literal("generate_answer"),
    data: z
      .object({
        domain: z.string().trim().default("Salesforce"),
        questionTitle: z.string().trim().min(1),
        questionType: questionTypeSchema,
        seniorityLevel: seniorityLevelSchema,
        topicName: z.string().trim().default("General Topic"),
        subcategoryName: z.string().trim().default("General"),
        codeSnippet: z.string().default(""),
        promptOverride: z.string().default(""),
      })
      .strict(),
  })
  .strict();

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
          }),
        question: z
          .object({
            slug: z.string().default(""),
            title: z.string().trim().min(1),
            summary: z.string().trim().min(1),
            questionType: questionTypeSchema,
            seniorityLevel: seniorityLevelSchema,
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

const aiComposeSchema = z.union([
  suggestTopicsSchema,
  resolveTemplateSchema,
  generateAnswerSchema,
  saveDraftSchema,
]);

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
  short_description: string | null;
  status: string | null;
  subcategory_id: string | null;
  subcategories: SubcategoryRelation | null;
};

type TopicDuplicateRow = {
  id: string;
  slug: string;
  name: string;
  status: string | null;
  subcategory_id: string | null;
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

type SuggestedTopic = {
  name: string;
  slug: string;
  subcategorySlug: string;
  subcategoryName: string;
  existingTopicSlug: string | null;
  reason: string;
  confidence: number;
};

export function normalizeOptionalText(value: string | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed || null;
}

export function slugifyText(value: string, fallback = "untitled") {
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return normalized || fallback;
}

export function normalizeNameForComparison(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeQuestionTitleForDuplicate(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeQuestionTitle(value: string) {
  return Array.from(
    new Set(
      value
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .map((word) => word.trim())
        .filter((word) => word.length >= 3),
    ),
  );
}

function parseJsonLoose<T>(input: string): T | null {
  const raw = input.trim();

  try {
    return JSON.parse(raw) as T;
  } catch {
    // keep going
  }

  const fencedMatch = raw.match(/```json\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    try {
      return JSON.parse(fencedMatch[1]) as T;
    } catch {
      // keep going
    }
  }

  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(raw.slice(start, end + 1)) as T;
    } catch {
      return null;
    }
  }

  return null;
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

function mapTopicRowToSuggested(
  topic: TopicRow,
  confidence = 0.85,
): SuggestedTopic {
  const subcategory = pickSingle(topic.subcategories);

  return {
    name: topic.name,
    slug: topic.slug,
    subcategorySlug: subcategory?.slug ?? "",
    subcategoryName: subcategory?.name ?? "",
    existingTopicSlug: topic.slug,
    reason: "Matched to an existing topic relevant to the question.",
    confidence,
  };
}

async function suggestTopicsDeterministic(
  questionTitle: string,
  topics: TopicRow[],
  limit: number,
): Promise<SuggestedTopic[]> {
  if (!topics.length) {
    return [];
  }

  const tokens = tokenizeQuestionTitle(questionTitle);

  const scored = topics
    .map((topic) => {
      const haystack =
        `${topic.name} ${topic.short_description ?? ""}`.toLowerCase();
      const score = tokens.reduce(
        (total, token) => total + (haystack.includes(token) ? 1 : 0),
        0,
      );

      return {
        topic,
        score,
      };
    })
    .sort((left, right) => right.score - left.score);

  const meaningful = scored.filter((item) => item.score > 0).slice(0, limit);
  if (meaningful.length) {
    return meaningful.map((item) =>
      mapTopicRowToSuggested(
        item.topic,
        Math.min(0.95, 0.6 + item.score * 0.1),
      ),
    );
  }

  return scored
    .slice(0, limit)
    .map((item) => mapTopicRowToSuggested(item.topic, 0.65));
}

const aiTopicSuggestionSchema = z.object({
  suggestions: z
    .array(
      z.object({
        name: z.string().trim().min(2),
        slug: z.string().trim().optional(),
        subcategory_slug: z.string().trim().optional().nullable(),
        existing_topic_slug: z.string().trim().optional().nullable(),
        reason: z.string().trim().optional().default(""),
        confidence: z.number().min(0).max(1).optional().default(0.75),
      }),
    )
    .default([]),
});

async function suggestTopicsWithAi({
  questionTitle,
  preferredSubcategorySlug,
  limit,
  subcategories,
  topics,
}: {
  questionTitle: string;
  preferredSubcategorySlug: string;
  limit: number;
  subcategories: SubcategoryRow[];
  topics: TopicRow[];
}) {
  if (!topics.length || !subcategories.length || !canUseOpenAi()) {
    return suggestTopicsDeterministic(questionTitle, topics, limit);
  }

  const topicCatalog = topics.slice(0, 200).map((topic) => {
    const subcategory = pickSingle(topic.subcategories);
    return {
      slug: topic.slug,
      name: topic.name,
      short_description: topic.short_description ?? "",
      subcategory_slug: subcategory?.slug ?? "",
      subcategory_name: subcategory?.name ?? "",
    };
  });

  const subcategoryCatalog = subcategories.map((subcategory) => ({
    slug: subcategory.slug,
    name: subcategory.name,
  }));

  const prompt = `
Question title: ${questionTitle}
Preferred subcategory slug: ${preferredSubcategorySlug || "none"}

Available subcategories:
${JSON.stringify(subcategoryCatalog)}

Existing topics:
${JSON.stringify(topicCatalog)}

Return JSON only:
{
  "suggestions": [
    {
      "name": "topic display name",
      "slug": "topic-slug",
      "subcategory_slug": "subcategory slug",
      "existing_topic_slug": "existing slug if this maps to an existing topic, else null",
      "reason": "short reason",
      "confidence": 0.0
    }
  ]
}

Rules:
- Return at most ${limit} suggestions.
- Prefer existing topics when strong matches exist.
- If no strong existing match, suggest one new topic candidate.
- Keep confidence between 0 and 1.
- Never invent a subcategory slug not in the provided list.
`.trim();

  const aiResponse = await createOpenAiChatCompletion(
    [
      {
        role: "system",
        content:
          "You suggest interview prep topics from a controlled catalog. Respond with valid JSON only.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    {
      responseFormat: "json_object",
    },
  );

  const parsed = parseJsonLoose<unknown>(aiResponse);
  const validated = aiTopicSuggestionSchema.safeParse(parsed);

  if (!validated.success) {
    return suggestTopicsDeterministic(questionTitle, topics, limit);
  }

  const subcategoryBySlug = new Map(
    subcategories.map((item) => [item.slug, item]),
  );
  const topicBySlug = new Map(topics.map((item) => [item.slug, item]));

  const mapped: SuggestedTopic[] = [];

  for (const suggestion of validated.data.suggestions.slice(0, limit)) {
    const explicitExistingSlug = suggestion.existing_topic_slug?.trim() || "";
    const explicitSlug = suggestion.slug?.trim() || "";

    const existingTopic =
      topicBySlug.get(explicitExistingSlug) ||
      topicBySlug.get(explicitSlug) ||
      topics.find(
        (topic) =>
          normalizeNameForComparison(topic.name) ===
          normalizeNameForComparison(suggestion.name),
      );

    if (existingTopic) {
      mapped.push(
        mapTopicRowToSuggested(existingTopic, suggestion.confidence ?? 0.8),
      );
      continue;
    }

    const subcategorySlug =
      suggestion.subcategory_slug?.trim() ||
      preferredSubcategorySlug ||
      subcategories[0]?.slug ||
      "";
    const subcategory = subcategoryBySlug.get(subcategorySlug);

    mapped.push({
      name: suggestion.name,
      slug: slugifyText(suggestion.slug || suggestion.name, "topic"),
      subcategorySlug,
      subcategoryName: subcategory?.name ?? "",
      existingTopicSlug: null,
      reason: suggestion.reason || "Suggested as a new topic candidate.",
      confidence: suggestion.confidence ?? 0.75,
    });
  }

  return mapped.slice(0, limit);
}

function formatDuplicateQuestions(rows: QuestionDuplicateRow[]) {
  if (!rows.length) {
    return "";
  }

  return rows
    .slice(0, 5)
    .map((row) => `${row.slug} (${row.status ?? "draft"})`)
    .join(", ");
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

async function resolveQuestionDuplicates(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  title: string,
  excludeSlug: string,
) {
  const { data, error } = await supabase
    .from("questions")
    .select("slug, title, status")
    .limit(4000)
    .returns<QuestionDuplicateRow[]>();

  if (error) {
    throw new Error(
      `Unable to run question duplicate checks: ${error.message}`,
    );
  }

  const normalizedInput = normalizeQuestionTitleForDuplicate(title);

  return ((data as QuestionDuplicateRow[] | null) ?? []).filter((row) => {
    if (row.slug === excludeSlug) {
      return false;
    }

    return (
      normalizeQuestionTitleForDuplicate(row.title || "") === normalizedInput
    );
  });
}

async function resolveQuestionSlug(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  requestedSlugRaw: string,
  questionTitle: string,
) {
  const requestedQuestionSlug = requestedSlugRaw.trim().toLowerCase();

  if (requestedQuestionSlug && !slugPattern.test(requestedQuestionSlug)) {
    throw new Error("Provided question slug is invalid.");
  }

  if (requestedQuestionSlug) {
    return requestedQuestionSlug;
  }

  return ensureUniqueSlug(
    supabase,
    "questions",
    slugifyText(questionTitle, "question"),
  );
}

async function resolveTopicCreation({
  supabase,
  createTopicInput,
  userId,
  warnings,
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  createTopicInput: z.infer<typeof saveDraftSchema>["data"]["createTopic"];
  userId: string;
  warnings: string[];
}) {
  const subcategorySlug = createTopicInput.subcategorySlug.trim().toLowerCase();

  if (!slugPattern.test(subcategorySlug)) {
    throw new Error("Topic subcategory slug is invalid.");
  }

  const { data: subcategoryRow, error: subcategoryError } = await supabase
    .from("subcategories")
    .select("id, slug, name, categories(slug, name)")
    .eq("slug", subcategorySlug)
    .maybeSingle<SubcategoryRow>();

  if (subcategoryError) {
    throw new Error(
      `Unable to resolve topic subcategory: ${subcategoryError.message}`,
    );
  }

  if (!subcategoryRow) {
    throw new Error(`Subcategory "${subcategorySlug}" was not found.`);
  }

  const requestedTopicSlugRaw = createTopicInput.slug.trim().toLowerCase();
  const requestedTopicSlug = requestedTopicSlugRaw
    ? slugPattern.test(requestedTopicSlugRaw)
      ? requestedTopicSlugRaw
      : null
    : "";

  if (requestedTopicSlug === null) {
    throw new Error("Provided topic slug is invalid.");
  }

  const normalizedTopicName = normalizeNameForComparison(createTopicInput.name);

  const { data: duplicateTopicRows, error: duplicateTopicError } =
    await supabase
      .from("topics")
      .select("id, slug, name, status, subcategory_id")
      .eq("subcategory_id", subcategoryRow.id)
      .limit(50)
      .returns<TopicDuplicateRow[]>();

  if (duplicateTopicError) {
    throw new Error(
      `Unable to run topic duplication checks: ${duplicateTopicError.message}`,
    );
  }

  const duplicateRows =
    (duplicateTopicRows as TopicDuplicateRow[] | null) ?? [];
  const nameMatch = duplicateRows.find(
    (row) => normalizeNameForComparison(row.name) === normalizedTopicName,
  );

  if (nameMatch) {
    const warning = formatTopicDuplicateWarning([nameMatch]);
    if (warning) {
      warnings.push(warning);
    }

    return {
      topicId: nameMatch.id,
      topicSlug: nameMatch.slug,
      categoryName: pickSingle(subcategoryRow.categories)?.name ?? "",
    };
  }

  if (requestedTopicSlug) {
    const { data: existingBySlug, error: existingBySlugError } = await supabase
      .from("topics")
      .select("id, slug, subcategory_id, status")
      .eq("slug", requestedTopicSlug)
      .maybeSingle<{
        id: string;
        slug: string;
        subcategory_id: string | null;
        status: string | null;
      }>();

    if (existingBySlugError) {
      throw new Error(
        `Unable to check topic slug availability: ${existingBySlugError.message}`,
      );
    }

    if (existingBySlug) {
      if (existingBySlug.subcategory_id !== subcategoryRow.id) {
        throw new Error(
          `Topic slug "${requestedTopicSlug}" already exists in another subcategory.`,
        );
      }

      return {
        topicId: existingBySlug.id,
        topicSlug: existingBySlug.slug,
        categoryName: pickSingle(subcategoryRow.categories)?.name ?? "",
      };
    }
  }

  const topicSlug =
    requestedTopicSlug ||
    (await ensureUniqueSlug(
      supabase,
      "topics",
      slugifyText(createTopicInput.name, "topic"),
    ));

  const { data: insertedTopic, error: insertTopicError } = await supabase
    .from("topics")
    .insert({
      slug: topicSlug,
      name: createTopicInput.name.trim(),
      short_description: createTopicInput.shortDescription.trim(),
      overview_markdown: createTopicInput.overviewMarkdown,
      sort_order: createTopicInput.sortOrder,
      subcategory_id: subcategoryRow.id,
      status: "draft",
      created_by: userId,
      updated_by: userId,
    })
    .select("id")
    .maybeSingle<{ id: string }>();

  if (insertTopicError || !insertedTopic) {
    throw new Error(
      `Unable to create topic: ${insertTopicError?.message ?? "Unknown error"}`,
    );
  }

  return {
    topicId: insertedTopic.id,
    topicSlug,
    categoryName: pickSingle(subcategoryRow.categories)?.name ?? "",
  };
}

async function resolveTopicContext(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  existingTopicSlugs: string[],
) {
  if (!existingTopicSlugs.length) {
    return [];
  }

  const { data: existingTopicRows, error: existingTopicsError } = await supabase
    .from("topics")
    .select(
      "id, slug, name, short_description, status, subcategory_id, subcategories(slug, name, categories(slug, name))",
    )
    .in("slug", existingTopicSlugs)
    .returns<TopicRow[]>();

  if (existingTopicsError) {
    throw new Error(
      `Unable to load selected topics: ${existingTopicsError.message}`,
    );
  }

  const bySlug = new Map(
    ((existingTopicRows as TopicRow[] | null) ?? []).map((row) => [
      row.slug,
      row,
    ]),
  );

  const orderedRows: TopicRow[] = [];

  for (const slug of existingTopicSlugs) {
    const row = bySlug.get(slug);

    if (!row) {
      throw new Error(`Selected topic "${slug}" was not found.`);
    }

    orderedRows.push(row);
  }

  return orderedRows;
}

export async function POST(request: Request) {
  const parsed = aiComposeSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid AI compose payload.",
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

  if (parsed.data.action === "resolve_template") {
    const resolvedPrompt = await resolveTemplatePrompt({
      domain: parsed.data.data.domain,
      questionType: parsed.data.data.questionType,
      questionTitle: parsed.data.data.questionTitle,
      topicName: parsed.data.data.topicName || "General Topic",
      subcategoryName: parsed.data.data.subcategoryName || "General",
      seniorityLevel: parsed.data.data.seniorityLevel,
      codeSnippet: parsed.data.data.codeSnippet,
      codeLanguage: "apex",
    });

    return NextResponse.json({
      ok: true,
      resolvedPrompt,
    });
  }

  if (parsed.data.action === "generate_answer") {
    if (!canUseOpenAi()) {
      return NextResponse.json(
        {
          error:
            "AI generation is not configured. Set OPENAI_API_KEY in server environment variables.",
        },
        { status: 503 },
      );
    }

    const fallbackResolvedPrompt = await resolveTemplatePrompt({
      domain: parsed.data.data.domain,
      questionType: parsed.data.data.questionType,
      questionTitle: parsed.data.data.questionTitle,
      topicName: parsed.data.data.topicName || "General Topic",
      subcategoryName: parsed.data.data.subcategoryName || "General",
      seniorityLevel: parsed.data.data.seniorityLevel,
      codeSnippet: parsed.data.data.codeSnippet,
      codeLanguage: "apex",
    });

    const prompt =
      parsed.data.data.promptOverride.trim() || fallbackResolvedPrompt;

    try {
      const answerMarkdown = await createOpenAiChatCompletion(
        [
          {
            role: "system",
            content:
              "You are an expert interview coach. Follow the prompt exactly and return markdown only.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        {
          responseFormat: "text",
        },
      );

      return NextResponse.json({
        ok: true,
        answerMarkdown,
        resolvedPrompt: prompt,
      });
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Unable to generate answer right now.",
        },
        { status: 502 },
      );
    }
  }

  if (parsed.data.action === "suggest_topics") {
    const [
      { data: subcategoriesData, error: subcategoriesError },
      { data: topicsData, error: topicsError },
    ] = await Promise.all([
      supabase
        .from("subcategories")
        .select("id, slug, name, categories(slug, name)")
        .order("name", { ascending: true }),
      supabase
        .from("topics")
        .select(
          "id, slug, name, short_description, status, subcategory_id, subcategories(slug, name, categories(slug, name))",
        )
        .order("name", { ascending: true }),
    ]);

    if (subcategoriesError) {
      return NextResponse.json(
        {
          error: `Unable to load subcategories: ${subcategoriesError.message}`,
        },
        { status: 500 },
      );
    }

    if (topicsError) {
      return NextResponse.json(
        {
          error: `Unable to load topics: ${topicsError.message}`,
        },
        { status: 500 },
      );
    }

    const subcategories = (subcategoriesData as SubcategoryRow[] | null) ?? [];
    const topics = (topicsData as TopicRow[] | null) ?? [];

    const preferredSubcategorySlug = parsed.data.data.subcategorySlug
      .trim()
      .toLowerCase();

    try {
      const suggestions = await suggestTopicsWithAi({
        questionTitle: parsed.data.data.questionTitle,
        preferredSubcategorySlug,
        limit: parsed.data.data.limit,
        subcategories,
        topics,
      });

      return NextResponse.json({
        ok: true,
        suggestions,
      });
    } catch (error) {
      const fallback = await suggestTopicsDeterministic(
        parsed.data.data.questionTitle,
        topics,
        parsed.data.data.limit,
      );

      return NextResponse.json({
        ok: true,
        suggestions: fallback,
        warnings: [
          error instanceof Error
            ? error.message
            : "AI suggestions failed; deterministic fallback used.",
        ],
      });
    }
  }

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

  try {
    const existingTopicRows = await resolveTopicContext(
      supabase,
      normalizedExistingTopicSlugs,
    );

    for (const topic of existingTopicRows) {
      linkedTopicIdsOrdered.push(topic.id);
      linkedTopicSlugsOrdered.push(topic.slug);

      const subcategory = pickSingle(topic.subcategories);
      const category = pickSingle(subcategory?.categories);

      if (category?.name) {
        linkedCategoryLabelsOrdered.push(category.name);
      }
    }

    if (createTopicInput.enabled) {
      const created = await resolveTopicCreation({
        supabase,
        createTopicInput,
        userId: user.id,
        warnings,
      });

      linkedTopicIdsOrdered.push(created.topicId);
      linkedTopicSlugsOrdered.push(created.topicSlug);

      if (created.categoryName) {
        linkedCategoryLabelsOrdered.push(created.categoryName);
      }
    }
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to resolve topics.",
      },
      { status: 400 },
    );
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

  let questionSlug = "";

  try {
    questionSlug = await resolveQuestionSlug(
      supabase,
      questionInput.slug,
      questionInput.title,
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to resolve question slug.",
      },
      { status: 400 },
    );
  }

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
          "Question slug is already published. Use a new custom slug or leave slug empty to auto-generate.",
      },
      { status: 409 },
    );
  }

  let duplicateQuestionRows: QuestionDuplicateRow[] = [];

  try {
    duplicateQuestionRows = await resolveQuestionDuplicates(
      supabase,
      questionInput.title,
      questionSlug,
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to check duplicates.",
      },
      { status: 500 },
    );
  }

  if (duplicateQuestionRows.length) {
    return NextResponse.json(
      {
        error: `Duplicate question title detected. Matching rows: ${formatDuplicateQuestions(
          duplicateQuestionRows,
        )}`,
        duplicates: duplicateQuestionRows.slice(0, 5),
      },
      { status: 409 },
    );
  }

  let questionId: string | null = null;

  if (existingQuestion) {
    const { error: updateQuestionError } = await supabase
      .from("questions")
      .update({
        title: questionInput.title.trim(),
        summary: questionInput.summary.trim(),
        question_type: questionInput.questionType,
        seniority_level: questionInput.seniorityLevel,
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
          question_type: questionInput.questionType,
          seniority_level: questionInput.seniorityLevel,
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
          "Primary answer is already published. Use another question slug or leave slug empty to auto-generate.",
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
    const { error: insertAnswerError } = await supabase.from("answers").insert({
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
  });
}
