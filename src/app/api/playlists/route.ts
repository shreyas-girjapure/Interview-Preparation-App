import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
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

    // 2. Fetch all user-created collections (is_system = false)
    const { data: collections, error: fetchError } = await supabase
      .from("playlists")
      .select(
        "id, slug, title, description, cover_image_url, created_at, updated_at",
      )
      .eq("created_by", user.id)
      .eq("is_system", false)
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("Error fetching user collections:", fetchError);
      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 },
      );
    }

    return NextResponse.json(collections);
  } catch (error) {
    console.error("Unexpected error in GET /api/playlists:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

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
    const title = body?.title?.trim();
    const description = body?.description?.trim() || null;

    if (!title || title.length < 3) {
      return NextResponse.json(
        { error: "Title must be at least 3 characters long." },
        { status: 400 },
      );
    }

    // 3. Insert the new user-collection
    // Note: The database trigger `ensure_user_playlist_slug` will handle generating the slug
    const { data: newCollection, error: insertError } = await supabase
      .from("playlists")
      .insert({
        title,
        description,
        is_system: false,
        created_by: user.id,
      })
      .select("id, slug, title, description, created_at, updated_at")
      .single();

    if (insertError) {
      console.error("Error creating user collection:", insertError);
      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 },
      );
    }

    return NextResponse.json(newCollection, { status: 201 });
  } catch (error) {
    console.error("Unexpected error in POST /api/playlists:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
