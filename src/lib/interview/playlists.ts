import { createSupabasePublicServerClient } from "@/lib/supabase/public-server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  type InterviewQuestionSummary,
  mapQuestionSummary,
} from "@/lib/interview/questions";
import { pickSingle } from "@/lib/utils";

export type PlaylistType = "role" | "company" | "custom";
export type PlaylistAccess = "free" | "preview" | "paid";

export type PlaylistDashboardItem = {
  id: string;
  slug: string;
  title: string;
  description: string;
  isSystem: boolean;
  tag: string | null;
  accessLevel: PlaylistAccess;
  totalItems: number;
  uniqueTopicCount: number;
  estimatedMinutes: number;
  nextUp: string;
  itemsRead: number;
  completionPercent: number;
  createdAt: string | null;
  updatedAt: string | null;
};

export type PlaylistQuestionItem = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  sortOrder: number;
};

export type PlaylistDetails = {
  id: string;
  slug: string;
  title: string;
  description: string;
  isSystem: boolean;
  tag: string | null;
  accessLevel: PlaylistAccess;
  totalItems: number;
  estimatedMinutes: number;
  nextUp: string;
  nextQuestionSlug: string | null;
  itemsRead: number;
  completionPercent: number;
  questions: PlaylistQuestionItem[];
  questionSummaries: InterviewQuestionSummary[];
};

type QuestionTopicRelation =
  | { topic_id: string | null }
  | Array<{ topic_id: string | null }>;

type PlaylistQuestionRow = {
  id: string | null;
  slug: string | null;
  title: string | null;
  summary: string | null;
  status: string | null;
  question_topics: QuestionTopicRelation | null;
};

type PlaylistQuestionRelation = PlaylistQuestionRow | PlaylistQuestionRow[];

type PlaylistRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  is_system: boolean;
  tag: string | null;
  access_level: PlaylistAccess;
  created_at: string | null;
  updated_at: string | null;
  playlist_items: Array<{
    id: string;
    sort_order: number | null;
    questions: PlaylistQuestionRelation | null;
  }> | null;
};

export type PlaylistFilters = {
  search?: string;
  sort?: string;
};

/* ── Richer row type used by getPlaylistBySlug ── */

type DetailCategoryRelation =
  | { slug: string | null; name: string | null }
  | Array<{ slug: string | null; name: string | null }>;

type DetailSubcategoryRelation =
  | {
      slug: string | null;
      name: string | null;
      categories: DetailCategoryRelation | null;
    }
  | Array<{
      slug: string | null;
      name: string | null;
      categories: DetailCategoryRelation | null;
    }>;

type DetailTopicRelation = {
  id: string | null;
  slug: string | null;
  name: string | null;
  short_description: string | null;
  status: string | null;
  subcategories: DetailSubcategoryRelation | null;
};

type PlaylistDetailQuestionRow = {
  id: string | null;
  slug: string | null;
  title: string | null;
  summary: string | null;
  status: string | null;
  updated_at: string | null;
  question_topics: Array<{
    sort_order: number | null;
    topics: DetailTopicRelation | DetailTopicRelation[] | null;
  }> | null;
};

type PlaylistDetailQuestionRelation =
  | PlaylistDetailQuestionRow
  | PlaylistDetailQuestionRow[];

type PlaylistDetailRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  is_system: boolean;
  tag: string | null;
  access_level: PlaylistAccess;
  playlist_items: Array<{
    id: string;
    sort_order: number | null;
    questions: PlaylistDetailQuestionRelation | null;
  }> | null;
};

type UserQuestionReadRow = {
  question_id: string;
};

type SupabasePublicServerClient = ReturnType<
  typeof createSupabasePublicServerClient
>;

function isDynamicServerUsageError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    (error as { digest?: string }).digest === "DYNAMIC_SERVER_USAGE"
  );
}

function safeEstimateMinutes(totalItems: number) {
  return Math.max(10, totalItems * 8);
}

function normalizeItemText(value: string | null | undefined) {
  return value?.trim() || "Continue from the next question";
}

function normalizePlaylistSummary(value: string | null | undefined) {
  return value?.trim() || "No playlist summary has been added yet.";
}

function normalizeQuestionSummary(value: string | null | undefined) {
  return value?.trim() || "Open this question to view the full walkthrough.";
}

function clampItemsRead(itemsRead: number, totalItems: number) {
  return Math.min(totalItems, Math.max(0, itemsRead));
}

function toCompletionPercent(itemsRead: number, totalItems: number) {
  if (!totalItems) {
    return 0;
  }

  return Math.min(100, Math.round((itemsRead / totalItems) * 100));
}

function countReadQuestions(
  questions: PlaylistQuestionItem[],
  readQuestionIds: Set<string>,
) {
  return questions.reduce(
    (count, question) => count + (readQuestionIds.has(question.id) ? 1 : 0),
    0,
  );
}

function resolveNextQuestion(
  questions: PlaylistQuestionItem[],
  readQuestionIds: Set<string>,
) {
  return (
    questions.find((question) => !readQuestionIds.has(question.id)) ??
    questions[questions.length - 1]
  );
}

function mapPlaylistQuestions(playlist: PlaylistRow) {
  const orderedItems = [...(playlist.playlist_items ?? [])].sort(
    (a, b) =>
      (a.sort_order ?? Number.MAX_SAFE_INTEGER) -
      (b.sort_order ?? Number.MAX_SAFE_INTEGER),
  );

  return orderedItems
    .map((item, index) => {
      const question = pickSingle(item.questions);

      if (
        !question?.id ||
        !question.slug ||
        !question.title ||
        question.status !== "published"
      ) {
        return null;
      }

      return {
        id: question.id,
        slug: question.slug,
        title: question.title,
        summary: normalizeQuestionSummary(question.summary),
        sortOrder: item.sort_order ?? index + 1,
      };
    })
    .filter((question): question is PlaylistQuestionItem => Boolean(question));
}

function mapPlaylistUniqueTopicCount(playlist: PlaylistRow) {
  const topicIds = new Set<string>();

  for (const item of playlist.playlist_items ?? []) {
    const question = pickSingle(item.questions);

    if (
      !question?.id ||
      !question.slug ||
      !question.title ||
      question.status !== "published"
    ) {
      continue;
    }

    const topicRelations = Array.isArray(question.question_topics)
      ? question.question_topics
      : question.question_topics
        ? [question.question_topics]
        : [];

    for (const topicRelation of topicRelations) {
      const topicId = topicRelation.topic_id?.trim();

      if (topicId) {
        topicIds.add(topicId);
      }
    }
  }

  return topicIds.size;
}

function mapPlaylists(rows: PlaylistRow[], readQuestionIds: Set<string>) {
  return rows.map<PlaylistDashboardItem>((playlist) => {
    const questions = mapPlaylistQuestions(playlist);
    const totalItems = questions.length;
    const itemsRead = clampItemsRead(
      countReadQuestions(questions, readQuestionIds),
      totalItems,
    );
    const nextQuestion = resolveNextQuestion(questions, readQuestionIds);

    return {
      id: playlist.id,
      slug: playlist.slug,
      title: playlist.title,
      description: normalizePlaylistSummary(playlist.description),
      isSystem: playlist.is_system,
      tag: playlist.tag,
      accessLevel: playlist.access_level,
      totalItems,
      uniqueTopicCount: mapPlaylistUniqueTopicCount(playlist),
      estimatedMinutes: safeEstimateMinutes(totalItems),
      nextUp: normalizeItemText(nextQuestion?.title || nextQuestion?.summary),
      itemsRead,
      completionPercent: toCompletionPercent(itemsRead, totalItems),
      createdAt: playlist.created_at,
      updatedAt: playlist.updated_at,
    };
  });
}

function listQuestionIdsForPlaylists(playlists: PlaylistRow[]) {
  const questionIds = new Set<string>();

  for (const playlist of playlists) {
    for (const question of mapPlaylistQuestions(playlist)) {
      questionIds.add(question.id);
    }
  }

  return [...questionIds];
}

async function withPublicPlaylistClient<T>(
  fallback: T,
  action: (supabase: SupabasePublicServerClient) => Promise<T>,
) {
  try {
    const publicSupabase = createSupabasePublicServerClient();
    return await action(publicSupabase);
  } catch (error) {
    console.warn(
      "Playlist queries unavailable without Supabase public env",
      error,
    );
    return fallback;
  }
}

async function listUserReadQuestionIds(questionIds: string[]) {
  if (!questionIds.length) {
    return new Set<string>();
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Set<string>();
    }

    const { data: questionProgressData, error: questionProgressError } =
      await supabase
        .from("user_question_progress")
        .select("question_id")
        .eq("user_id", user.id)
        .eq("is_read", true)
        .in("question_id", questionIds)
        .returns<UserQuestionReadRow[]>();

    if (questionProgressError) {
      console.warn(
        "Failed to fetch user question progress for playlists",
        questionProgressError,
      );
      return new Set<string>();
    }

    return new Set((questionProgressData ?? []).map((row) => row.question_id));
  } catch (error) {
    if (isDynamicServerUsageError(error)) {
      return new Set<string>();
    }

    console.warn("Unable to fetch question progress for playlists", error);
    return new Set<string>();
  }
}

export async function listPlaylistSlugs() {
  return withPublicPlaylistClient<string[]>([], async (publicSupabase) => {
    const { data, error } = await publicSupabase
      .from("playlists")
      .select("slug")
      .eq("status", "published")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch playlist slugs", error);
      return [];
    }

    return ((data as Array<{ slug: string | null }> | null) ?? [])
      .map((row) => row.slug?.trim())
      .filter((slug): slug is string => Boolean(slug));
  });
}

export async function listPlaylistDashboardItems(
  filters: PlaylistFilters = {},
) {
  const search = filters.search ?? "";
  const sortOption = filters.sort ?? "newest";

  const playlists = await withPublicPlaylistClient<PlaylistRow[]>(
    [],
    async (publicSupabase) => {
      const { data, error } = await publicSupabase
        .from("playlists")
        .select(
          "id, slug, title, description, is_system, tag, access_level, sort_order, created_at, updated_at, playlist_items(id, sort_order, questions(id, slug, title, summary, status, question_topics(topic_id)))",
        )
        .eq("status", "published")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(12)
        .returns<PlaylistRow[]>();

      if (error) {
        console.error("Failed to fetch playlists", error);
        return [];
      }

      return data ?? [];
    },
  );

  if (!playlists.length) {
    return [];
  }

  const readQuestionIds = await listUserReadQuestionIds(
    listQuestionIdsForPlaylists(playlists),
  );

  const mapped = mapPlaylists(playlists, readQuestionIds);

  return sortPlaylists(
    mapped.filter((p) => {
      if (!search) return true;
      const term = search.toLowerCase();
      return (
        p.title.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term)
      );
    }),
    sortOption,
  );
}

export type PlaylistSortOption =
  | "newest"
  | "oldest"
  | "recently-modified"
  | "alphabetical";

export function sortPlaylists<
  T extends {
    title: string;
    createdAt?: string | null;
    updatedAt?: string | null;
  },
>(playlists: T[], sortOption: PlaylistSortOption | string = "newest"): T[] {
  return [...playlists].sort((a, b) => {
    if (sortOption === "alphabetical") {
      return a.title.localeCompare(b.title);
    }

    if (sortOption === "recently-modified") {
      const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return timeB - timeA;
    }

    // Default to newest or explicit "oldest"
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;

    if (sortOption === "oldest") {
      return timeA - timeB;
    }

    return timeB - timeA; // newest
  });
}

export async function listFeaturedPlaylists(limit = 3) {
  const playlists = await listPlaylistDashboardItems();
  return playlists.slice(0, Math.max(0, limit));
}

function mapPlaylistDetailQuestionSummaries(
  playlist: PlaylistDetailRow,
): InterviewQuestionSummary[] {
  const orderedItems = [...(playlist.playlist_items ?? [])].sort(
    (a, b) =>
      (a.sort_order ?? Number.MAX_SAFE_INTEGER) -
      (b.sort_order ?? Number.MAX_SAFE_INTEGER),
  );

  return orderedItems
    .map((item) => {
      const question = pickSingle(item.questions);

      if (
        !question?.id ||
        !question.slug ||
        !question.title ||
        question.status !== "published"
      ) {
        return null;
      }

      // Shape the row to match the QuestionRow type that mapQuestionSummary expects
      return mapQuestionSummary({
        id: question.id,
        slug: question.slug,
        title: question.title,
        summary: question.summary,
        created_at: null,
        published_at: null,
        updated_at: question.updated_at ?? null,
        question_topics: question.question_topics,
      });
    })
    .filter((summary): summary is InterviewQuestionSummary => Boolean(summary));
}

export async function getPlaylistBySlug(slug: string) {
  const normalizedSlug = slug.trim().toLowerCase();
  if (!normalizedSlug) {
    return undefined;
  }

  const playlist = await withPublicPlaylistClient<
    PlaylistDetailRow | undefined
  >(undefined, async (publicSupabase) => {
    const { data, error } = await publicSupabase
      .from("playlists")
      .select(
        `id, slug, title, description, is_system, tag, access_level,
           playlist_items(id, sort_order,
             questions(id, slug, title, summary, status, updated_at,
               question_topics(sort_order,
                 topics(id, slug, name, short_description, status,
                   subcategories(slug, name,
                     categories(slug, name)
                   )
                 )
               )
             )
           )`,
      )
      .eq("status", "published")
      .eq("slug", normalizedSlug)
      .maybeSingle();

    if (error) {
      console.error(`Failed to fetch playlist "${normalizedSlug}"`, error);
      return undefined;
    }

    return (data as PlaylistDetailRow | null) ?? undefined;
  });

  if (!playlist) {
    return undefined;
  }

  // Build lightweight items for legacy fields
  const questions = mapPlaylistQuestions(playlist as unknown as PlaylistRow);
  // Build full summaries for QuestionCard rendering
  const questionSummaries = mapPlaylistDetailQuestionSummaries(playlist);
  const totalItems = questions.length;
  const readQuestionIds = await listUserReadQuestionIds(
    questions.map((question) => question.id),
  );
  const itemsRead = clampItemsRead(
    countReadQuestions(questions, readQuestionIds),
    totalItems,
  );
  const nextQuestion = resolveNextQuestion(questions, readQuestionIds);

  return {
    id: playlist.id,
    slug: playlist.slug,
    title: playlist.title,
    description: normalizePlaylistSummary(playlist.description),
    isSystem: playlist.is_system,
    tag: playlist.tag,
    accessLevel: playlist.access_level,
    totalItems,
    estimatedMinutes: safeEstimateMinutes(totalItems),
    nextUp: normalizeItemText(nextQuestion?.title || nextQuestion?.summary),
    nextQuestionSlug: nextQuestion?.slug ?? null,
    itemsRead,
    completionPercent: toCompletionPercent(itemsRead, totalItems),
    questions,
    questionSummaries,
  } satisfies PlaylistDetails;
}
