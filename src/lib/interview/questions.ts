import { createSupabasePublicServerClient } from "@/lib/supabase/public-server";

export type InterviewQuestion = {
  id: string;
  slug: string;
  title: string;
  category: string;
  categories: string[];
  categorySlugs: string[];
  summary: string;
  answerMarkdown: string;
  topicSlugs: string[];
};

export type InterviewQuestionSummary = Omit<
  InterviewQuestion,
  "answerMarkdown"
>;

export type QuestionFilters = {
  category?: string;
  search?: string;
};

export type InterviewTopicSummary = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  questionCount: number;
};

export type InterviewTopicDetails = InterviewTopicSummary & {
  overviewMarkdown: string;
  prerequisiteTopics: InterviewTopicSummary[];
  relatedQuestions: InterviewQuestionSummary[];
  relatedTopics: InterviewTopicSummary[];
};

export type TopicFilters = {
  search?: string;
};

type FilterOption = {
  label: string;
  value: string;
  count: number;
};

type CategoryRelation =
  | { slug: string | null; name: string | null }
  | Array<{ slug: string | null; name: string | null }>;

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

type TopicRelation = {
  id: string | null;
  slug: string | null;
  name: string | null;
  short_description: string | null;
  status: string | null;
  subcategories: SubcategoryRelation | null;
};

type QuestionRow = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  created_at: string | null;
  published_at: string | null;
  question_topics: Array<{
    sort_order: number | null;
    topics: TopicRelation | TopicRelation[] | null;
  }> | null;
};

type TopicRow = {
  id: string;
  slug: string;
  name: string;
  short_description: string | null;
  overview_markdown: string | null;
  sort_order: number | null;
  subcategory_id: string | null;
};

type TopicRelationType = "related" | "prerequisite" | "deep_dive";

type TopicEdgeRow = {
  to_topic_id: string;
  sort_order: number | null;
  relation_type: TopicRelationType;
};

type QuestionTopicCountRow = {
  topic_id: string;
  questions:
    | { status: string | null }
    | Array<{ status: string | null }>
    | null;
};

type AnswerRow = {
  content_markdown: string | null;
};

type SupabaseServerClient = ReturnType<typeof createSupabasePublicServerClient>;

function normalize(text: string) {
  return text.trim().toLowerCase();
}

function pickSingle<T>(value: T | T[] | null | undefined): T | null {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function assertNoError(error: { message?: string } | null, context: string) {
  if (error) {
    throw new Error(`${context}: ${error.message ?? "Unknown error"}`);
  }
}

async function withContentClient<T>(
  fallback: T,
  action: (supabase: SupabaseServerClient) => Promise<T>,
) {
  try {
    const supabase = createSupabasePublicServerClient();
    return await action(supabase);
  } catch (error) {
    console.error("Interview content query failed", error);
    return fallback;
  }
}

function mapTopicSlugs(questionTopics: QuestionRow["question_topics"]) {
  if (!questionTopics?.length) {
    return [];
  }

  const mapped = questionTopics
    .map((relation) => ({
      sortOrder: relation.sort_order ?? Number.MAX_SAFE_INTEGER,
      topic: pickSingle(relation.topics),
    }))
    .filter((entry) => Boolean(entry.topic?.slug))
    .filter((entry) => entry.topic?.status !== "draft");

  mapped.sort((a, b) => a.sortOrder - b.sortOrder);

  const topicSlugs: string[] = [];
  const seen = new Set<string>();

  for (const entry of mapped) {
    const topicSlug = entry.topic?.slug;

    if (!topicSlug || seen.has(topicSlug)) {
      continue;
    }

    seen.add(topicSlug);
    topicSlugs.push(topicSlug);
  }

  return topicSlugs;
}

function mapCategoryMetadata(questionTopics: QuestionRow["question_topics"]) {
  if (!questionTopics?.length) {
    return {
      labels: [],
      slugs: [],
    };
  }

  const labels: string[] = [];
  const slugs: string[] = [];
  const seen = new Set<string>();

  const mapped = questionTopics
    .map((relation) => ({
      sortOrder: relation.sort_order ?? Number.MAX_SAFE_INTEGER,
      topic: pickSingle(relation.topics),
    }))
    .filter((entry) => entry.topic?.status !== "draft")
    .sort((a, b) => a.sortOrder - b.sortOrder);

  for (const entry of mapped) {
    const topicSubcategory = pickSingle(entry.topic?.subcategories);
    const topicCategory = pickSingle(topicSubcategory?.categories);
    const categoryLabel = topicCategory?.name?.trim();
    const categorySlug = topicCategory?.slug?.trim().toLowerCase();

    if (!categoryLabel || !categorySlug || seen.has(categorySlug)) {
      continue;
    }

    seen.add(categorySlug);
    labels.push(categoryLabel);
    slugs.push(categorySlug);
  }

  return {
    labels,
    slugs,
  };
}

function mapQuestionSummary(row: QuestionRow): InterviewQuestionSummary {
  const categories = mapCategoryMetadata(row.question_topics);

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: categories.labels[0] ?? "General",
    categories: categories.labels,
    categorySlugs: categories.slugs,
    summary: row.summary?.trim() || "No summary available yet.",
    topicSlugs: mapTopicSlugs(row.question_topics),
  };
}

function mapQuestionDetail(
  row: QuestionRow,
  answerMarkdown: string,
): InterviewQuestion {
  return {
    ...mapQuestionSummary(row),
    answerMarkdown,
  };
}

function countOverlap(left: string[], right: string[]) {
  if (!left.length || !right.length) {
    return 0;
  }

  const rightSet = new Set(right);
  const seen = new Set<string>();
  let count = 0;

  for (const item of left) {
    if (seen.has(item)) {
      continue;
    }

    seen.add(item);

    if (rightSet.has(item)) {
      count += 1;
    }
  }

  return count;
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

function stripGeneratedTopicSections(source: string) {
  const lines = source.split(/\r?\n/);
  const headingsToStrip = new Set(["prerequisites", "related topics"]);
  const kept: string[] = [];
  let skipping = false;

  for (const line of lines) {
    const headingMatch = line.match(/^##\s+(.+?)\s*$/i);

    if (headingMatch) {
      const heading = headingMatch[1]?.trim().toLowerCase() ?? "";

      if (headingsToStrip.has(heading)) {
        skipping = true;
        continue;
      }

      skipping = false;
      kept.push(line);
      continue;
    }

    if (!skipping) {
      kept.push(line);
    }
  }

  return kept.join("\n").trim();
}

function deriveFallbackPrerequisiteTopicIds(
  currentTopic: TopicRow,
  topicRows: TopicRow[],
) {
  const currentSort = currentTopic.sort_order ?? Number.MAX_SAFE_INTEGER;
  const foundationalKeywords = [
    "fundamentals",
    "basics",
    "intro",
    "introduction",
    "core",
    "101",
  ];

  const candidates = topicRows
    .filter((candidate) => candidate.id !== currentTopic.id)
    .filter(
      (candidate) =>
        Boolean(candidate.subcategory_id) &&
        candidate.subcategory_id === currentTopic.subcategory_id,
    )
    .filter((candidate) => (candidate.sort_order ?? Number.MAX_SAFE_INTEGER) < currentSort)
    .map((candidate) => {
      const topicText = `${candidate.slug} ${candidate.name}`.toLowerCase();
      const hasFoundationalKeyword = foundationalKeywords.some((keyword) =>
        topicText.includes(keyword),
      );

      return {
        id: candidate.id,
        sortOrder: candidate.sort_order ?? Number.MAX_SAFE_INTEGER,
        hasFoundationalKeyword,
        name: candidate.name,
      };
    });

  candidates.sort((left, right) => {
    if (left.hasFoundationalKeyword !== right.hasFoundationalKeyword) {
      return left.hasFoundationalKeyword ? -1 : 1;
    }

    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }

    return left.name.localeCompare(right.name);
  });

  return candidates.map((candidate) => candidate.id);
}

function deriveFallbackRelatedTopicIds(
  currentTopic: TopicRow,
  topicRows: TopicRow[],
  relatedQuestions: InterviewQuestionSummary[],
) {
  const cooccurrenceScores = new Map<string, number>();

  for (const question of relatedQuestions) {
    if (!question.topicSlugs.includes(currentTopic.slug)) {
      continue;
    }

    for (const topicSlug of question.topicSlugs) {
      if (topicSlug === currentTopic.slug) {
        continue;
      }

      cooccurrenceScores.set(topicSlug, (cooccurrenceScores.get(topicSlug) ?? 0) + 1);
    }
  }

  const topicBySlug = new Map(topicRows.map((topic) => [topic.slug, topic]));

  const cooccurrenceTopicIds = Array.from(cooccurrenceScores.entries())
    .map(([topicSlug, score]) => {
      const topic = topicBySlug.get(topicSlug);
      if (!topic) {
        return null;
      }

      return {
        id: topic.id,
        score,
        sortOrder: topic.sort_order ?? Number.MAX_SAFE_INTEGER,
        name: topic.name,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder;
      }

      return left.name.localeCompare(right.name);
    })
    .map((entry) => entry.id);

  const sameSubcategoryNeighbors = topicRows
    .filter((topic) => topic.id !== currentTopic.id)
    .filter(
      (topic) =>
        Boolean(topic.subcategory_id) && topic.subcategory_id === currentTopic.subcategory_id,
    )
    .map((topic) => ({
      id: topic.id,
      distance:
        Math.abs((topic.sort_order ?? Number.MAX_SAFE_INTEGER) - (currentTopic.sort_order ?? Number.MAX_SAFE_INTEGER)),
      sortOrder: topic.sort_order ?? Number.MAX_SAFE_INTEGER,
      name: topic.name,
    }))
    .sort((left, right) => {
      if (left.distance !== right.distance) {
        return left.distance - right.distance;
      }

      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder;
      }

      return left.name.localeCompare(right.name);
    })
    .map((topic) => topic.id);

  return dedupeKeepOrder([...cooccurrenceTopicIds, ...sameSubcategoryNeighbors]);
}

function matchesQuestionSearch(
  question: InterviewQuestionSummary,
  search: string,
) {
  const term = normalize(search);

  if (!term) {
    return true;
  }

  return [
    question.title,
    question.summary,
    question.category,
    ...question.categories,
    ...question.topicSlugs,
  ]
    .join(" ")
    .toLowerCase()
    .includes(term);
}

function matchesTopicSearch(topic: InterviewTopicSummary, search: string) {
  const term = normalize(search);

  if (!term) {
    return true;
  }

  return [topic.name, topic.shortDescription, topic.slug]
    .join(" ")
    .toLowerCase()
    .includes(term);
}

async function fetchPublishedQuestionRows() {
  return withContentClient<QuestionRow[]>([], async (supabase) => {
    const { data, error } = await supabase
      .from("questions")
      .select(
        `
          id,
          slug,
          title,
          summary,
          created_at,
          published_at,
          question_topics(
            sort_order,
            topics(
              id,
              slug,
              name,
              short_description,
              status,
              subcategories(
                slug,
                name,
                categories(
                  slug,
                  name
                )
              )
            )
          )
        `,
      )
      .eq("status", "published")
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false, nullsFirst: false });

    assertNoError(error, "Failed to fetch published questions");
    return (data as QuestionRow[] | null) ?? [];
  });
}

async function fetchPublishedTopicRows() {
  return withContentClient<TopicRow[]>([], async (supabase) => {
    const { data, error } = await supabase
      .from("topics")
      .select(
        "id, slug, name, short_description, overview_markdown, sort_order, subcategory_id",
      )
      .eq("status", "published")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    assertNoError(error, "Failed to fetch published topics");
    return (data as TopicRow[] | null) ?? [];
  });
}

async function fetchTopicEdges(fromTopicId: string) {
  return withContentClient<TopicEdgeRow[]>([], async (supabase) => {
    const { data, error } = await supabase
      .from("topic_edges")
      .select("to_topic_id, relation_type, sort_order")
      .eq("from_topic_id", fromTopicId)
      .order("sort_order", { ascending: true });

    assertNoError(error, "Failed to fetch topic edges");
    return (data as TopicEdgeRow[] | null) ?? [];
  });
}

async function fetchPublishedQuestionCountByTopicIds(topicIds: string[]) {
  if (!topicIds.length) {
    return new Map<string, number>();
  }

  return withContentClient<Map<string, number>>(new Map(), async (supabase) => {
    const { data, error } = await supabase
      .from("question_topics")
      .select("topic_id, questions(status)")
      .in("topic_id", topicIds);

    assertNoError(error, "Failed to fetch topic question counts");

    const counts = new Map<string, number>();

    for (const row of (data as QuestionTopicCountRow[] | null) ?? []) {
      const linkedQuestion = pickSingle(row.questions);
      if (linkedQuestion?.status !== "published") {
        continue;
      }

      counts.set(row.topic_id, (counts.get(row.topic_id) ?? 0) + 1);
    }

    return counts;
  });
}

function mapTopicSummary(
  topic: TopicRow,
  countsByTopicId: Map<string, number>,
): InterviewTopicSummary {
  return {
    id: topic.id,
    slug: topic.slug,
    name: topic.name,
    shortDescription:
      topic.short_description?.trim() ||
      "Interview concept overview is being prepared.",
    questionCount: countsByTopicId.get(topic.id) ?? 0,
  };
}

async function resolveQuestionSummaryBySlug(slug: string) {
  const question = await getQuestionBySlug(slug);

  if (!question) {
    return undefined;
  }

  return {
    id: question.id,
    slug: question.slug,
    title: question.title,
    category: question.category,
    categories: question.categories,
    categorySlugs: question.categorySlugs,
    summary: question.summary,
    topicSlugs: question.topicSlugs,
  };
}

export async function listQuestions(filters: QuestionFilters = {}) {
  const category = normalize(filters.category ?? "");
  const search = filters.search ?? "";

  const summaries = (await fetchPublishedQuestionRows()).map(
    mapQuestionSummary,
  );

  return summaries.filter((question) => {
    const categoryMatch = category
      ? question.categorySlugs.includes(category)
      : true;
    const searchMatch = matchesQuestionSearch(question, search);

    return categoryMatch && searchMatch;
  });
}

export async function listQuestionFilterOptions() {
  const categoryMap = new Map<string, { label: string; count: number }>();
  const summaries = (await fetchPublishedQuestionRows()).map(
    mapQuestionSummary,
  );

  for (const question of summaries) {
    question.categorySlugs.forEach((slug, index) => {
      const label = question.categories[index] ?? question.category;
      const existing = categoryMap.get(slug);

      if (existing) {
        existing.count += 1;
      } else {
        categoryMap.set(slug, { label, count: 1 });
      }
    });
  }

  const categories: FilterOption[] = Array.from(categoryMap.entries())
    .map(([value, entry]) => ({
      label: entry.label,
      value,
      count: entry.count,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return { categories };
}

export async function listFeaturedQuestions(limit = 3) {
  const summaries = (await fetchPublishedQuestionRows()).map(
    mapQuestionSummary,
  );
  return summaries.slice(0, limit);
}

export async function listQuestionSlugs() {
  return withContentClient<string[]>([], async (supabase) => {
    const { data, error } = await supabase
      .from("questions")
      .select("slug")
      .eq("status", "published")
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false, nullsFirst: false });

    assertNoError(error, "Failed to fetch question slugs");

    return ((data as Array<{ slug: string | null }> | null) ?? [])
      .map((row) => row.slug)
      .filter((slug): slug is string => Boolean(slug));
  });
}

export async function getQuestionBySlug(slug: string) {
  return withContentClient<InterviewQuestion | undefined>(
    undefined,
    async (supabase) => {
      const { data: questionRow, error: questionError } = await supabase
        .from("questions")
        .select(
          `
            id,
            slug,
            title,
            summary,
            created_at,
            published_at,
            question_topics(
              sort_order,
              topics(
                id,
                slug,
                name,
                short_description,
                status,
                subcategories(
                  slug,
                  name,
                  categories(
                    slug,
                    name
                  )
                )
              )
            )
          `,
        )
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();

      assertNoError(questionError, `Failed to fetch question "${slug}"`);

      if (!questionRow) {
        return undefined;
      }

      const { data: answerRows, error: answerError } = await supabase
        .from("answers")
        .select("content_markdown")
        .eq("question_id", questionRow.id)
        .eq("status", "published")
        .order("is_primary", { ascending: false })
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false, nullsFirst: false })
        .limit(1);

      assertNoError(
        answerError,
        `Failed to fetch published answer for "${questionRow.slug}"`,
      );

      const answerRow = ((answerRows as AnswerRow[] | null) ?? [])[0];
      const answerMarkdown =
        answerRow?.content_markdown?.trim() ||
        "Answer content for this question is coming soon.";

      return mapQuestionDetail(questionRow as QuestionRow, answerMarkdown);
    },
  );
}

export async function listTopics(filters: TopicFilters = {}) {
  const search = filters.search ?? "";
  const topicRows = await fetchPublishedTopicRows();
  const countsByTopicId = await fetchPublishedQuestionCountByTopicIds(
    topicRows.map((topic) => topic.id),
  );

  return topicRows
    .map((topic) => mapTopicSummary(topic, countsByTopicId))
    .filter((topic) => matchesTopicSearch(topic, search));
}

export async function listTopicSlugs() {
  const topics = await fetchPublishedTopicRows();
  return topics.map((topic) => topic.slug);
}

export async function getTopicBySlug(
  slug: string,
): Promise<InterviewTopicDetails | undefined> {
  const topicRows = await fetchPublishedTopicRows();
  const currentTopic = topicRows.find((topic) => topic.slug === slug);

  if (!currentTopic) {
    return undefined;
  }

  const countsByTopicId = await fetchPublishedQuestionCountByTopicIds(
    topicRows.map((topic) => topic.id),
  );
  const topicSummaries = topicRows.map((topic) =>
    mapTopicSummary(topic, countsByTopicId),
  );
  const topicSummaryById = new Map(
    topicSummaries.map((topic) => [topic.id, topic]),
  );

  const [edges, relatedQuestions] = await Promise.all([
    fetchTopicEdges(currentTopic.id),
    listQuestions({}),
  ]);

  const relatedQuestionsForTopic = relatedQuestions.filter((question) =>
    question.topicSlugs.includes(slug),
  );

  const sortedEdges = [...edges].sort((left, right) => {
    const sortOrderDiff =
      (left.sort_order ?? Number.MAX_SAFE_INTEGER) -
      (right.sort_order ?? Number.MAX_SAFE_INTEGER);

    if (sortOrderDiff !== 0) {
      return sortOrderDiff;
    }

    return left.relation_type.localeCompare(right.relation_type);
  });

  const prerequisiteTopicIdsFromEdges = dedupeKeepOrder(
    sortedEdges
      .filter((edge) => edge.relation_type === "prerequisite")
      .map((edge) => edge.to_topic_id),
  );

  const relatedTopicIdsFromEdges = dedupeKeepOrder(
    sortedEdges
      .filter((edge) => edge.relation_type !== "prerequisite")
      .map((edge) => edge.to_topic_id),
  );

  const fallbackPrerequisiteTopicIds = deriveFallbackPrerequisiteTopicIds(
    currentTopic,
    topicRows,
  );
  const prerequisiteTopicIds = dedupeKeepOrder([
    ...prerequisiteTopicIdsFromEdges,
    ...fallbackPrerequisiteTopicIds,
  ])
    .filter((topicId) => topicId !== currentTopic.id)
    .slice(0, 3);

  const prerequisiteTopicIdSet = new Set(prerequisiteTopicIds);

  const fallbackRelatedTopicIds = deriveFallbackRelatedTopicIds(
    currentTopic,
    topicRows,
    relatedQuestionsForTopic,
  );
  const relatedTopicIds = dedupeKeepOrder([
    ...relatedTopicIdsFromEdges,
    ...fallbackRelatedTopicIds,
  ])
    .filter((topicId) => topicId !== currentTopic.id)
    .filter((topicId) => !prerequisiteTopicIdSet.has(topicId))
    .slice(0, 4);

  const prerequisiteTopics = prerequisiteTopicIds
    .map((topicId) => topicSummaryById.get(topicId))
    .filter((topic): topic is InterviewTopicSummary => Boolean(topic));

  const relatedTopics = relatedTopicIds
    .map((topicId) => topicSummaryById.get(topicId))
    .filter((topic): topic is InterviewTopicSummary => Boolean(topic));

  const currentTopicSummary = topicSummaryById.get(currentTopic.id);
  if (!currentTopicSummary) {
    return undefined;
  }

  const cleanedOverviewMarkdown = stripGeneratedTopicSections(
    currentTopic.overview_markdown?.trim() || "",
  );

  return {
    ...currentTopicSummary,
    overviewMarkdown:
      cleanedOverviewMarkdown || "Topic overview content is being prepared.",
    prerequisiteTopics,
    relatedQuestions: relatedQuestionsForTopic,
    relatedTopics,
  };
}

export async function listTopicsForQuestion(
  question: string | InterviewQuestion | InterviewQuestionSummary,
) {
  const topicSlugs =
    typeof question === "string"
      ? ((await resolveQuestionSummaryBySlug(question))?.topicSlugs ?? [])
      : question.topicSlugs;

  if (!topicSlugs.length) {
    return [];
  }

  const topics = await listTopics();
  const topicBySlug = new Map(topics.map((topic) => [topic.slug, topic]));

  return topicSlugs
    .map((topicSlug) => topicBySlug.get(topicSlug))
    .filter((topic): topic is InterviewTopicSummary => Boolean(topic));
}

export async function listRabbitHoleTopics(
  question: string | InterviewQuestion | InterviewQuestionSummary,
  limit = 3,
) {
  const topics = await listTopicsForQuestion(question);
  return topics.slice(0, limit);
}

export async function listRelatedQuestionsForQuestion(
  question: string | InterviewQuestion | InterviewQuestionSummary,
  limit = 8,
) {
  if (limit <= 0) {
    return [];
  }

  const currentQuestion =
    typeof question === "string"
      ? await resolveQuestionSummaryBySlug(question)
      : question;

  if (!currentQuestion) {
    return [];
  }

  const allQuestions = await listQuestions({});
  const candidates = allQuestions.filter(
    (candidate) =>
      candidate.id !== currentQuestion.id && candidate.slug !== currentQuestion.slug,
  );

  const ranked = candidates
    .map((candidate) => {
      const sharedTopics = countOverlap(
        candidate.topicSlugs,
        currentQuestion.topicSlugs,
      );
      const sharedCategories = countOverlap(
        candidate.categorySlugs,
        currentQuestion.categorySlugs,
      );

      const score =
        sharedTopics * 100 +
        sharedCategories * 30;

      return {
        candidate,
        score,
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return a.candidate.title.localeCompare(b.candidate.title);
    })
    .map((entry) => entry.candidate);

  if (ranked.length >= limit) {
    return ranked.slice(0, limit);
  }

  const seen = new Set(ranked.map((candidate) => candidate.id));
  const fallback = candidates.filter((candidate) => !seen.has(candidate.id));

  return [...ranked, ...fallback].slice(0, limit);
}
