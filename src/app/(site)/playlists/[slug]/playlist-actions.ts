"use server";

import { revalidatePath } from "next/cache";
import { hasAdminAreaAccess, isAppRole } from "@/lib/auth/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const MIN_TITLE_LENGTH = 3;
const MAX_TITLE_LENGTH = 300;

type PlaylistMutationFailure = {
  ok: false;
  message: string;
};

type PlaylistMutationSuccess<T extends object = object> = {
  ok: true;
  message: string;
} & T;

type PlaylistMutationResult<T extends object = object> =
  | PlaylistMutationSuccess<T>
  | PlaylistMutationFailure;

type OwnedPlaylistRow = {
  id: string;
  slug: string;
  title: string;
  is_system: boolean;
  created_by: string | null;
};

type PublishedQuestionRow = {
  id: string;
};

type PlaylistItemRow = {
  question_id: string;
};

function normalizeTitle(value: string) {
  return value.trim();
}

function normalizeDescription(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

function normalizeQuestionIds(values: string[] | null | undefined) {
  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const value of values ?? []) {
    const questionId = value.trim();

    if (!questionId || seen.has(questionId)) {
      continue;
    }

    seen.add(questionId);
    normalized.push(questionId);
  }

  return normalized;
}

async function requireEditablePlaylist(playlistId: string): Promise<
  PlaylistMutationResult<{
    supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
    userId: string;
    playlist: OwnedPlaylistRow;
  }>
> {
  const normalizedPlaylistId = playlistId.trim();

  if (!normalizedPlaylistId) {
    return {
      ok: false,
      message: "Invalid playlist id.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      ok: false,
      message: "You must be signed in to manage playlists.",
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: string | null }>();

  if (profileError) {
    console.error(
      "Failed to resolve user role for playlist management",
      profileError,
    );
    return {
      ok: false,
      message: "Unable to validate playlist access right now.",
    };
  }

  const role = isAppRole(profile?.role) ? profile.role : null;
  const hasGlobalPlaylistAccess = hasAdminAreaAccess(role);

  let playlistLookup = supabase
    .from("playlists")
    .select("id, slug, title, is_system, created_by")
    .eq("id", normalizedPlaylistId);

  if (!hasGlobalPlaylistAccess) {
    playlistLookup = playlistLookup.eq("created_by", user.id);
  }

  const { data: playlist, error: playlistError } =
    await playlistLookup.maybeSingle<OwnedPlaylistRow>();

  if (playlistError) {
    console.error("Failed to validate playlist ownership", playlistError);
    return {
      ok: false,
      message: "Unable to validate playlist ownership right now.",
    };
  }

  if (!playlist || (!hasGlobalPlaylistAccess && playlist.is_system)) {
    return {
      ok: false,
      message: "Playlist not found or permission denied.",
    };
  }

  return {
    ok: true,
    message: "Validated playlist ownership.",
    supabase,
    userId: user.id,
    playlist,
  };
}

function revalidatePlaylistPaths(slug: string) {
  revalidatePath("/playlists");
  revalidatePath(`/playlists/${slug}`);
}

export async function updateUserPlaylist(payload: {
  playlistId: string;
  title: string;
  description: string | null;
  questionIds: string[];
}): Promise<
  PlaylistMutationResult<{
    title: string;
    description: string | null;
    questionIds: string[];
  }>
> {
  const title = normalizeTitle(payload.title);
  const description = normalizeDescription(payload.description);
  const questionIds = normalizeQuestionIds(payload.questionIds);

  if (title.length < MIN_TITLE_LENGTH || title.length > MAX_TITLE_LENGTH) {
    return {
      ok: false,
      message: `Playlist name must be ${MIN_TITLE_LENGTH}-${MAX_TITLE_LENGTH} characters.`,
    };
  }
  if (questionIds.length === 0) {
    return {
      ok: false,
      message: "Select at least one question.",
    };
  }

  const context = await requireEditablePlaylist(payload.playlistId);
  if (!context.ok) {
    return context;
  }

  const { supabase, userId, playlist } = context;
  const { data: publishedQuestions, error: publishedQuestionsError } =
    await supabase
      .from("questions")
      .select("id")
      .eq("status", "published")
      .in("id", questionIds)
      .returns<PublishedQuestionRow[]>();

  if (publishedQuestionsError) {
    console.error(
      "Failed to validate selected questions",
      publishedQuestionsError,
    );
    return {
      ok: false,
      message: `Failed to validate selected questions: ${publishedQuestionsError.message}`,
    };
  }

  const publishedQuestionIdSet = new Set(
    (publishedQuestions ?? []).map((question) => question.id),
  );

  if (publishedQuestionIdSet.size !== questionIds.length) {
    return {
      ok: false,
      message: "One or more selected questions are unavailable.",
    };
  }

  const { data: existingItems, error: existingItemsError } = await supabase
    .from("playlist_items")
    .select("question_id")
    .eq("playlist_id", playlist.id)
    .returns<PlaylistItemRow[]>();

  if (existingItemsError) {
    console.error("Failed to load playlist questions", existingItemsError);
    return {
      ok: false,
      message: `Failed to load playlist questions: ${existingItemsError.message}`,
    };
  }

  const { error: playlistUpdateError } = await supabase
    .from("playlists")
    .update({
      title,
      description,
      updated_by: userId,
    })
    .eq("id", playlist.id);

  if (playlistUpdateError) {
    console.error("Failed to update playlist", playlistUpdateError);
    return {
      ok: false,
      message: `Failed to update playlist: ${playlistUpdateError.message}`,
    };
  }

  const nextItems = questionIds.map((questionId, index) => ({
    playlist_id: playlist.id,
    question_id: questionId,
    sort_order: index + 1,
  }));

  const { error: upsertItemsError } = await supabase
    .from("playlist_items")
    .upsert(nextItems, {
      onConflict: "playlist_id,question_id",
    });

  if (upsertItemsError) {
    console.error("Failed to update playlist questions", upsertItemsError);
    return {
      ok: false,
      message: `Failed to update playlist questions: ${upsertItemsError.message}`,
    };
  }

  const nextQuestionIdSet = new Set(questionIds);
  const questionIdsToDelete = (existingItems ?? [])
    .map((item) => item.question_id)
    .filter((questionId) => !nextQuestionIdSet.has(questionId));

  if (questionIdsToDelete.length > 0) {
    const { error: deleteItemsError } = await supabase
      .from("playlist_items")
      .delete()
      .eq("playlist_id", playlist.id)
      .in("question_id", questionIdsToDelete);

    if (deleteItemsError) {
      console.error(
        "Failed to remove unselected playlist questions",
        deleteItemsError,
      );
      return {
        ok: false,
        message: `Failed to remove unselected questions: ${deleteItemsError.message}`,
      };
    }
  }

  revalidatePlaylistPaths(playlist.slug);

  return {
    ok: true,
    message: "Playlist updated.",
    title,
    description,
    questionIds,
  };
}

export async function deleteUserPlaylist(payload: {
  playlistId: string;
}): Promise<PlaylistMutationResult<{ deletedTitle: string }>> {
  const context = await requireEditablePlaylist(payload.playlistId);
  if (!context.ok) {
    return context;
  }

  const { supabase, playlist } = context;
  const { error } = await supabase
    .from("playlists")
    .delete()
    .eq("id", playlist.id);

  if (error) {
    console.error("Failed to delete playlist", error);
    return {
      ok: false,
      message: `Failed to delete playlist: ${error.message}`,
    };
  }

  revalidatePlaylistPaths(playlist.slug);

  return {
    ok: true,
    message: "Playlist deleted.",
    deletedTitle: playlist.title,
  };
}
