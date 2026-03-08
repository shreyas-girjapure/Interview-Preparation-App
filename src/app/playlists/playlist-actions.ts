"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type CreatePlaylistResult = {
  ok: boolean;
  message: string;
};

function toSlug(text: string) {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") +
    "-" +
    Math.random().toString(36).slice(2, 6)
  );
}

export async function createUserPlaylist(payload: {
  name: string;
  description: string;
  questionIds: string[];
}): Promise<CreatePlaylistResult> {
  const { name, description, questionIds } = payload;

  // ── Validation ──
  if (!name.trim()) {
    return { ok: false, message: "Playlist name is required." };
  }
  if (!description.trim()) {
    return { ok: false, message: "Description is required." };
  }
  if (questionIds.length === 0) {
    return { ok: false, message: "Select at least one question." };
  }

  const supabase = await createSupabaseServerClient();

  // ── Check authenticated user ──
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      message: "You must be signed in to create a playlist.",
    };
  }

  // ── Insert playlist (slug generated server-side) ──
  const { data: playlist, error: playlistError } = await supabase
    .from("playlists")
    .insert({
      slug: toSlug(name),
      title: name.trim(),
      description: description.trim(),
      is_system: false,
      access_level: "free",
      status: "published",
      published_at: new Date().toISOString(),
      created_by: user.id,
      updated_by: user.id,
    })
    .select("id")
    .single();

  if (playlistError || !playlist) {
    console.error("Failed to create playlist", playlistError);
    return {
      ok: false,
      message: `Failed to create playlist: ${playlistError?.message ?? "Unknown error"}`,
    };
  }

  // ── Insert playlist items ──
  const items = questionIds.map((questionId, index) => ({
    playlist_id: playlist.id,
    question_id: questionId,
    sort_order: index + 1,
  }));

  const { error: itemsError } = await supabase
    .from("playlist_items")
    .insert(items);

  if (itemsError) {
    console.error("Failed to link questions to playlist", itemsError);
    // Playlist was created but items failed — still report partial success
    return {
      ok: false,
      message: `Playlist created but failed to add questions: ${itemsError.message}`,
    };
  }

  revalidatePath("/playlists");

  return {
    ok: true,
    message: `Playlist "${name.trim()}" created with ${questionIds.length} question${questionIds.length === 1 ? "" : "s"}.`,
  };
}

export type PlaylistWithPresence = {
  id: string;
  title: string;
  hasQuestion: boolean;
  questionCount: number;
  isOwner: boolean;
};

export async function getUserPlaylistsForQuestion(
  questionId: string,
): Promise<{
  ok: boolean;
  playlists: PlaylistWithPresence[];
  message?: string;
}> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, playlists: [], message: "You must be signed in." };
  }

  // Check if user is admin/editor
  const { data: userProfile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: string | null }>();

  const isAdmin =
    userProfile?.role === "admin" || userProfile?.role === "editor";

  // Admins see all playlists, regular users only their own
  let query = supabase
    .from("playlists")
    .select("id, title, created_by, playlist_items(question_id)")
    .order("created_at", { ascending: false });

  if (!isAdmin) {
    query = query.eq("created_by", user.id);
  }

  const { data: playlists, error } = await query;

  if (error || !playlists) {
    console.error("Failed to fetch user playlists", error);
    return { ok: false, playlists: [], message: "Failed to load playlists." };
  }

  const result: PlaylistWithPresence[] = playlists.map((p) => ({
    id: p.id,
    title: p.title,
    hasQuestion:
      p.playlist_items?.some(
        (item: { question_id: string }) => item.question_id === questionId,
      ) ?? false,
    questionCount: p.playlist_items?.length ?? 0,
    isOwner: p.created_by === user.id,
  }));

  return { ok: true, playlists: result };
}

export async function toggleQuestionInPlaylist(payload: {
  playlistId: string;
  questionId: string;
  isAdding: boolean;
}): Promise<{ ok: boolean; message: string }> {
  const { playlistId, questionId, isAdding } = payload;
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "You must be signed in to manage playlists." };
  }

  // Check if user is admin/editor
  const { data: userProfile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: string | null }>();

  const isAdmin =
    userProfile?.role === "admin" || userProfile?.role === "editor";

  // Verify playlist ownership (admins can modify any playlist)
  let playlistQuery = supabase
    .from("playlists")
    .select("id")
    .eq("id", playlistId);

  if (!isAdmin) {
    playlistQuery = playlistQuery.eq("created_by", user.id);
  }

  const { data: playlist, error: playlistError } = await playlistQuery.single();

  if (playlistError || !playlist) {
    return { ok: false, message: "Playlist not found or access denied." };
  }

  if (isAdding) {
    // Get max sort_order
    const { data: items } = await supabase
      .from("playlist_items")
      .select("sort_order")
      .eq("playlist_id", playlistId)
      .order("sort_order", { ascending: false })
      .limit(1);

    const nextSortOrder = (items?.[0]?.sort_order ?? 0) + 1;

    const { error: insertError } = await supabase
      .from("playlist_items")
      .insert({
        playlist_id: playlistId,
        question_id: questionId,
        sort_order: nextSortOrder,
      });

    if (insertError) {
      if (insertError.code === "23505") {
        // unique violation
        return { ok: true, message: "Question already in playlist." };
      }
      return { ok: false, message: "Failed to add question to playlist." };
    }
  } else {
    const { error: deleteError } = await supabase
      .from("playlist_items")
      .delete()
      .eq("playlist_id", playlistId)
      .eq("question_id", questionId);

    if (deleteError) {
      return { ok: false, message: "Failed to remove question." };
    }
  }

  revalidatePath("/playlists");
  return {
    ok: true,
    message: isAdding ? "Added to playlist" : "Removed from playlist",
  };
}
