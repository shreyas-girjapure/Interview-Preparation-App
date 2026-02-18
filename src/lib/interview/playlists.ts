import { createSupabasePublicServerClient } from "@/lib/supabase/public-server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { pickSingle } from "@/lib/utils";

export type PlaylistType = "role" | "company" | "custom";
export type PlaylistAccess = "free" | "preview" | "paid";

export type PlaylistDashboardItem = {
  id: string;
  slug: string;
  title: string;
  playlistType: PlaylistType;
  accessLevel: PlaylistAccess;
  totalItems: number;
  estimatedMinutes: number;
  nextUp: string;
  itemsRead: number;
  completionPercent: number;
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
  playlistType: PlaylistType;
  accessLevel: PlaylistAccess;
  totalItems: number;
  estimatedMinutes: number;
  nextUp: string;
  nextQuestionSlug: string | null;
  itemsRead: number;
  completionPercent: number;
  questions: PlaylistQuestionItem[];
};

type PlaylistQuestionRelation =
  | {
      id: string | null;
      slug: string | null;
      title: string | null;
      summary: string | null;
      status: string | null;
    }
  | Array<{
      id: string | null;
      slug: string | null;
      title: string | null;
      summary: string | null;
      status: string | null;
    }>;

type PlaylistRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  playlist_type: PlaylistType;
  access_level: PlaylistAccess;
  playlist_items: Array<{
    id: string;
    sort_order: number | null;
    questions: PlaylistQuestionRelation | null;
  }> | null;
};

type UserProgressRow = {
  playlist_id: string;
  items_read: number;
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

function mapPlaylists(rows: PlaylistRow[], progressRows: UserProgressRow[]) {
  const progressByPlaylist = new Map(
    progressRows.map((row) => [row.playlist_id, row.items_read]),
  );

  return rows.map<PlaylistDashboardItem>((playlist) => {
    const questions = mapPlaylistQuestions(playlist);
    const totalItems = questions.length;
    const itemsRead = clampItemsRead(
      progressByPlaylist.get(playlist.id) ?? 0,
      totalItems,
    );

    const nextQuestion =
      questions[Math.min(itemsRead, Math.max(totalItems - 1, 0))];

    return {
      id: playlist.id,
      slug: playlist.slug,
      title: playlist.title,
      playlistType: playlist.playlist_type,
      accessLevel: playlist.access_level,
      totalItems,
      estimatedMinutes: safeEstimateMinutes(totalItems),
      nextUp: normalizeItemText(nextQuestion?.title || nextQuestion?.summary),
      itemsRead,
      completionPercent: toCompletionPercent(itemsRead, totalItems),
    };
  });
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

async function listUserPlaylistProgress(playlistIds: string[]) {
  if (!playlistIds.length) {
    return [];
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return [];
    }

    const { data: progressData, error: progressError } = await supabase
      .from("user_playlist_progress")
      .select("playlist_id, items_read")
      .eq("user_id", user.id)
      .in("playlist_id", playlistIds)
      .returns<UserProgressRow[]>();

    if (progressError) {
      console.warn("Failed to fetch user playlist progress", progressError);
      return [];
    }

    return progressData ?? [];
  } catch (error) {
    if (isDynamicServerUsageError(error)) {
      return [];
    }

    console.warn("Unable to fetch authenticated playlist progress", error);
    return [];
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

export async function listPlaylistDashboardItems() {
  const playlists = await withPublicPlaylistClient<PlaylistRow[]>(
    [],
    async (publicSupabase) => {
      const { data, error } = await publicSupabase
        .from("playlists")
        .select(
          "id, slug, title, description, playlist_type, access_level, sort_order, playlist_items(id, sort_order, questions(id, slug, title, summary, status))",
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

  const progressRows = await listUserPlaylistProgress(
    playlists.map((playlist) => playlist.id),
  );
  return mapPlaylists(playlists, progressRows);
}

export async function getPlaylistBySlug(slug: string) {
  const normalizedSlug = slug.trim().toLowerCase();
  if (!normalizedSlug) {
    return undefined;
  }

  const playlist = await withPublicPlaylistClient<PlaylistRow | undefined>(
    undefined,
    async (publicSupabase) => {
      const { data, error } = await publicSupabase
        .from("playlists")
        .select(
          "id, slug, title, description, playlist_type, access_level, playlist_items(id, sort_order, questions(id, slug, title, summary, status))",
        )
        .eq("status", "published")
        .eq("slug", normalizedSlug)
        .maybeSingle();

      if (error) {
        console.error(`Failed to fetch playlist "${normalizedSlug}"`, error);
        return undefined;
      }

      return (data as PlaylistRow | null) ?? undefined;
    },
  );

  if (!playlist) {
    return undefined;
  }

  const questions = mapPlaylistQuestions(playlist);
  const totalItems = questions.length;
  const progressRows = await listUserPlaylistProgress([playlist.id]);
  const itemsRead = clampItemsRead(
    progressRows[0]?.items_read ?? 0,
    totalItems,
  );
  const nextQuestion =
    questions[Math.min(itemsRead, Math.max(totalItems - 1, 0))];

  return {
    id: playlist.id,
    slug: playlist.slug,
    title: playlist.title,
    description: normalizePlaylistSummary(playlist.description),
    playlistType: playlist.playlist_type,
    accessLevel: playlist.access_level,
    totalItems,
    estimatedMinutes: safeEstimateMinutes(totalItems),
    nextUp: normalizeItemText(nextQuestion?.title || nextQuestion?.summary),
    nextQuestionSlug: nextQuestion?.slug ?? null,
    itemsRead,
    completionPercent: toCompletionPercent(itemsRead, totalItems),
    questions,
  } satisfies PlaylistDetails;
}
