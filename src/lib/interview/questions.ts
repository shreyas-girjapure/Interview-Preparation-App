import { createSupabasePublicServerClient } from "@/lib/supabase/public-server";
import {
  QUESTION_DIFFICULTIES,
  type QuestionDifficulty,
} from "@/lib/interview/difficulty";

export { QUESTION_DIFFICULTIES };
export type { QuestionDifficulty };

export type InterviewQuestion = {
  id: string;
  slug: string;
  title: string;
  category: string;
  difficulty: QuestionDifficulty;
  summary: string;
  answerMarkdown: string;
  tags: string[];
  estimatedMinutes: number;
  topicSlugs: string[];
};

export type InterviewQuestionSummary = Omit<
  InterviewQuestion,
  "answerMarkdown"
>;

export type QuestionFilters = {
  category?: string;
  difficulty?: QuestionDifficulty;
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
  | { name: string | null }
  | Array<{ name: string | null }>;

type TopicRelation = {
  id: string | null;
  slug: string | null;
  name: string | null;
  short_description: string | null;
  status: string | null;
};

type QuestionRow = {
  id: string;
  slug: string;
  title: string;
  difficulty: string | null;
  summary: string | null;
  tags: string[] | null;
  estimated_minutes: number | null;
  created_at: string | null;
  published_at: string | null;
  categories: CategoryRelation | null;
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
};

type TopicEdgeRow = {
  to_topic_id: string;
  sort_order: number | null;
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

function mapCategoryName(categories: QuestionRow["categories"]) {
  const category = pickSingle(categories);
  return category?.name?.trim() || "General";
}

function mapDifficulty(difficulty: string | null): QuestionDifficulty {
  if (
    difficulty === "easy" ||
    difficulty === "medium" ||
    difficulty === "hard"
  ) {
    return difficulty;
  }

  return "medium";
}

function mapQuestionSummary(row: QuestionRow): InterviewQuestionSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: mapCategoryName(row.categories),
    difficulty: mapDifficulty(row.difficulty),
    summary: row.summary?.trim() || "No summary available yet.",
    tags: row.tags ?? [],
    estimatedMinutes: row.estimated_minutes ?? 5,
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
    ...question.tags,
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
          difficulty,
          summary,
          tags,
          estimated_minutes,
          created_at,
          published_at,
          categories(name),
          question_topics(
            sort_order,
            topics(
              id,
              slug,
              name,
              short_description,
              status
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
        "id, slug, name, short_description, overview_markdown, sort_order",
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
      .select("to_topic_id, sort_order")
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
    difficulty: question.difficulty,
    summary: question.summary,
    tags: question.tags,
    estimatedMinutes: question.estimatedMinutes,
    topicSlugs: question.topicSlugs,
  };
}

export function isQuestionDifficulty(
  value: string | null | undefined,
): value is QuestionDifficulty {
  return QUESTION_DIFFICULTIES.includes(value as QuestionDifficulty);
}

export async function listQuestions(filters: QuestionFilters = {}) {
  const category = normalize(filters.category ?? "");
  const difficulty = filters.difficulty;
  const search = filters.search ?? "";

  const summaries = (await fetchPublishedQuestionRows()).map(
    mapQuestionSummary,
  );

  return summaries.filter((question) => {
    const categoryMatch = category
      ? normalize(question.category) === category
      : true;
    const difficultyMatch = difficulty
      ? question.difficulty === difficulty
      : true;
    const searchMatch = matchesQuestionSearch(question, search);

    return categoryMatch && difficultyMatch && searchMatch;
  });
}

export async function listQuestionFilterOptions() {
  const categoryMap = new Map<string, number>();
  const difficultyMap = new Map<QuestionDifficulty, number>();
  const summaries = (await fetchPublishedQuestionRows()).map(
    mapQuestionSummary,
  );

  for (const question of summaries) {
    categoryMap.set(
      question.category,
      (categoryMap.get(question.category) ?? 0) + 1,
    );
    difficultyMap.set(
      question.difficulty,
      (difficultyMap.get(question.difficulty) ?? 0) + 1,
    );
  }

  const categories: FilterOption[] = Array.from(categoryMap.entries())
    .map(([label, count]) => ({
      label,
      value: label.toLowerCase(),
      count,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const difficulties: FilterOption[] = QUESTION_DIFFICULTIES.map((value) => ({
    label: value[0].toUpperCase() + value.slice(1),
    value,
    count: difficultyMap.get(value) ?? 0,
  }));

  return { categories, difficulties };
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
            difficulty,
            summary,
            tags,
            estimated_minutes,
            created_at,
            published_at,
            categories(name),
            question_topics(
              sort_order,
              topics(
                id,
                slug,
                name,
                short_description,
                status
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

  const relatedTopics = edges
    .sort(
      (a, b) =>
        (a.sort_order ?? Number.MAX_SAFE_INTEGER) -
        (b.sort_order ?? Number.MAX_SAFE_INTEGER),
    )
    .map((edge) => topicSummaryById.get(edge.to_topic_id))
    .filter((topic): topic is InterviewTopicSummary => Boolean(topic));

  const relatedQuestionsForTopic = relatedQuestions.filter((question) =>
    question.topicSlugs.includes(slug),
  );

  const currentTopicSummary = topicSummaryById.get(currentTopic.id);
  if (!currentTopicSummary) {
    return undefined;
  }

  return {
    ...currentTopicSummary,
    overviewMarkdown:
      currentTopic.overview_markdown?.trim() ||
      "Topic overview content is being prepared.",
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
