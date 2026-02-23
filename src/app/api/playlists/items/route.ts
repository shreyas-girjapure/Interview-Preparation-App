import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    // 1. Authenticate user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse request body
    const body = await request.json();
    const { playlistId, questionIds, action } = body;

    // Validate inputs
    if (!playlistId || typeof playlistId !== "string") {
      return NextResponse.json(
        { error: "Invalid collection ID." },
        { status: 400 },
      );
    }

    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return NextResponse.json(
        { error: "Must provide an array of question IDs." },
        { status: 400 },
      );
    }

    if (action !== "add" && action !== "remove") {
      return NextResponse.json(
        { error: "Action must be either 'add' or 'remove'." },
        { status: 400 },
      );
    }

    // 3. Verify the user owns this playlist/collection
    const { data: playlist, error: playlistError } = await supabase
      .from("playlists")
      .select("id, is_system")
      .eq("id", playlistId)
      .eq("created_by", user.id)
      .single();

    if (playlistError || !playlist) {
      return NextResponse.json(
        { error: "Collection not found or permission denied." },
        { status: 404 },
      );
    }

    if (playlist.is_system) {
      return NextResponse.json(
        { error: "Cannot modify system-generated playlists." },
        { status: 403 },
      );
    }

    // 4. Perform the requested action
    if (action === "add") {
      // Map question IDs to payload for bulk insert
      const itemsToInsert = questionIds.map((qId: string) => ({
        playlist_id: playlistId,
        question_id: qId,
      }));

      const { error: insertError } = await supabase
        .from("playlist_items")
        // Ignoring duplicates allows the action to be idempotent (if a question already exists in the playlist, skip it)
        .upsert(itemsToInsert, {
          onConflict: "playlist_id, question_id",
          ignoreDuplicates: true,
        });

      if (insertError) {
        console.error("Error bulk adding items to collection:", insertError);
        return NextResponse.json(
          { error: "Internal Server Error" },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        message: `Added ${questionIds.length} items.`,
      });
    }

    if (action === "remove") {
      const { error: deleteError } = await supabase
        .from("playlist_items")
        .delete()
        .eq("playlist_id", playlistId)
        .in("question_id", questionIds);

      if (deleteError) {
        console.error(
          "Error bulk removing items from collection:",
          deleteError,
        );
        return NextResponse.json(
          { error: "Internal Server Error" },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        message: `Removed ${questionIds.length} items.`,
      });
    }
  } catch (error) {
    console.error("Unexpected error in POST /api/playlists/items:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
