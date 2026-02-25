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
