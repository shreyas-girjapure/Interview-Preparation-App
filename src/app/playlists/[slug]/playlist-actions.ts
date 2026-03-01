"use server";

import { revalidatePath } from "next/cache";
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
};

function normalizeTitle(value: string) {
  return value.trim();
}

function normalizeDescription(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

async function requireOwnedUserPlaylist(playlistId: string): Promise<
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

  const { data: playlist, error: playlistError } = await supabase
    .from("playlists")
    .select("id, slug, title, is_system")
    .eq("id", normalizedPlaylistId)
    .eq("created_by", user.id)
    .maybeSingle<OwnedPlaylistRow>();

  if (playlistError) {
    console.error("Failed to validate playlist ownership", playlistError);
    return {
      ok: false,
      message: "Unable to validate playlist ownership right now.",
    };
  }

  if (!playlist || playlist.is_system) {
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
}): Promise<
  PlaylistMutationResult<{
    title: string;
    description: string | null;
  }>
> {
  const title = normalizeTitle(payload.title);
  const description = normalizeDescription(payload.description);

  if (title.length < MIN_TITLE_LENGTH || title.length > MAX_TITLE_LENGTH) {
    return {
      ok: false,
      message: `Playlist name must be ${MIN_TITLE_LENGTH}-${MAX_TITLE_LENGTH} characters.`,
    };
  }

  const context = await requireOwnedUserPlaylist(payload.playlistId);
  if (!context.ok) {
    return context;
  }

  const { supabase, userId, playlist } = context;
  const { error } = await supabase
    .from("playlists")
    .update({
      title,
      description,
      updated_by: userId,
    })
    .eq("id", playlist.id);

  if (error) {
    console.error("Failed to update playlist", error);
    return {
      ok: false,
      message: `Failed to update playlist: ${error.message}`,
    };
  }

  revalidatePlaylistPaths(playlist.slug);

  return {
    ok: true,
    message: "Playlist updated.",
    title,
    description,
  };
}

export async function deleteUserPlaylist(payload: {
  playlistId: string;
}): Promise<PlaylistMutationResult<{ deletedTitle: string }>> {
  const context = await requireOwnedUserPlaylist(payload.playlistId);
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
