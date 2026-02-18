import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { AdminPlaylistForms } from "@/app/admin/playlists/playlist-forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { hasAdminAreaAccess, isAppRole } from "@/lib/auth/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const createPlaylistSchema = z.object({
  slug: z.string().trim().min(3).max(120).regex(slugPattern, {
    message: "Slug must use lowercase letters, numbers, and hyphens.",
  }),
  title: z.string().trim().min(3).max(300),
  description: z.string().trim().max(1200).optional(),
  playlistType: z.enum(["role", "company", "custom"]),
  accessLevel: z.enum(["free", "preview", "paid"]),
  status: z.enum(["draft", "published"]),
  sortOrder: z.coerce.number().int().min(0).max(100000).default(0),
  previewCount: z.coerce.number().int().min(0).max(50).default(3),
});

const linkQuestionsSchema = z.object({
  playlistId: z.string().uuid(),
  questionIds: z.array(z.string().uuid()).min(1).max(300),
  sortOrder: z.coerce.number().int().min(1).max(100000).default(1),
});

type AdminActionResult = {
  ok: boolean;
  message: string;
};

function isDynamicServerUsageError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    (error as { digest?: string }).digest === "DYNAMIC_SERVER_USAGE"
  );
}

async function requireAdminAccess() {
  let supabase;

  try {
    supabase = await createSupabaseServerClient();
  } catch (error) {
    if (!isDynamicServerUsageError(error)) {
      console.warn("Admin playlists unavailable without Supabase env", error);
    }
    redirect("/unauthorized?reason=admin");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin/playlists");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: string | null }>();

  const role = isAppRole(profile?.role) ? profile.role : null;

  if (!hasAdminAreaAccess(role)) {
    redirect("/unauthorized?reason=admin");
  }

  return { supabase, userId: user.id };
}

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readTextList(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);
}

async function createPlaylistAction(
  formData: FormData,
): Promise<AdminActionResult> {
  "use server";

  const { supabase, userId } = await requireAdminAccess();

  const parsed = createPlaylistSchema.safeParse({
    slug: readText(formData, "slug").toLowerCase(),
    title: readText(formData, "title"),
    description: readText(formData, "description") || undefined,
    playlistType: readText(formData, "playlistType"),
    accessLevel: readText(formData, "accessLevel"),
    status: readText(formData, "status"),
    sortOrder: readText(formData, "sortOrder") || undefined,
    previewCount: readText(formData, "previewCount") || undefined,
  });

  if (!parsed.success) {
    console.warn(
      "Rejected invalid create playlist payload",
      parsed.error.flatten(),
    );
    return {
      ok: false,
      message: "Create playlist failed validation. Check the form fields.",
    };
  }

  const payload = parsed.data;
  const publishNow = payload.status === "published";

  const { error } = await supabase.from("playlists").insert({
    slug: payload.slug,
    title: payload.title,
    description: payload.description || null,
    playlist_type: payload.playlistType,
    access_level: payload.accessLevel,
    status: payload.status,
    sort_order: payload.sortOrder,
    preview_count: payload.previewCount,
    published_at: publishNow ? new Date().toISOString() : null,
    created_by: userId,
    updated_by: userId,
  });

  if (error) {
    console.error("Failed to create playlist", error);
    return {
      ok: false,
      message: `Failed to create playlist: ${error.message}`,
    };
  }

  revalidatePath("/admin/playlists");
  revalidatePath("/playlists");
  revalidatePath(`/playlists/${payload.slug}`);

  return {
    ok: true,
    message: `Playlist "${payload.title}" created.`,
  };
}

async function linkQuestionsAction(
  formData: FormData,
): Promise<AdminActionResult> {
  "use server";

  const { supabase } = await requireAdminAccess();

  const parsed = linkQuestionsSchema.safeParse({
    playlistId: readText(formData, "playlistId"),
    questionIds: Array.from(new Set(readTextList(formData, "questionIds"))),
    sortOrder: readText(formData, "sortOrder") || undefined,
  });

  if (!parsed.success) {
    console.warn(
      "Rejected invalid question linking payload",
      parsed.error.flatten(),
    );
    return {
      ok: false,
      message:
        "Link questions failed validation. Check playlist and selections.",
    };
  }

  const payload = parsed.data;

  const { data: publishedQuestions, error: publishedQuestionsError } =
    await supabase
      .from("questions")
      .select("id")
      .in("id", payload.questionIds)
      .eq("status", "published");

  if (publishedQuestionsError) {
    console.error(
      "Failed to validate published questions",
      publishedQuestionsError,
    );
    return {
      ok: false,
      message: `Could not validate published questions: ${publishedQuestionsError.message}`,
    };
  }

  const publishedQuestionIds = new Set(
    (publishedQuestions ?? []).map((question) => question.id),
  );

  const validQuestionIds = payload.questionIds.filter((questionId) =>
    publishedQuestionIds.has(questionId),
  );

  if (validQuestionIds.length === 0) {
    return {
      ok: false,
      message: "No selected questions are currently published.",
    };
  }

  const upsertRows = validQuestionIds.map((questionId, index) => ({
    playlist_id: payload.playlistId,
    question_id: questionId,
    sort_order: payload.sortOrder + index,
  }));

  const { error } = await supabase.from("playlist_items").upsert(upsertRows, {
    onConflict: "playlist_id,question_id",
  });

  if (error) {
    console.error("Failed to link questions to playlist", error);
    return {
      ok: false,
      message: `Failed to link questions: ${error.message}`,
    };
  }

  revalidatePath("/admin/playlists");
  revalidatePath("/playlists");

  return {
    ok: true,
    message: `${validQuestionIds.length} question${validQuestionIds.length === 1 ? "" : "s"} linked.`,
  };
}

export default async function AdminPlaylistsPage() {
  const { supabase } = await requireAdminAccess();

  const [{ data: playlists }, { data: questions }] = await Promise.all([
    supabase
      .from("playlists")
      .select(
        "id, title, slug, playlist_type, access_level, status, sort_order",
      )
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("questions")
      .select("id, title, slug")
      .eq("status", "published")
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const safePlaylists = playlists ?? [];
  const safeQuestions = questions ?? [];

  return (
    <main className="min-h-screen bg-[oklch(0.985_0.004_95)]">
      <section className="mx-auto w-full max-w-7xl space-y-8 px-6 py-12 md:px-10 md:py-16">
        <header className="space-y-4">
          <Badge variant="secondary" className="rounded-full px-3 py-1">
            Admin - Playlist Composer
          </Badge>
          <h1 className="max-w-4xl font-serif text-4xl leading-tight tracking-tight md:text-5xl">
            Create playlists and link questions
          </h1>
          <p className="max-w-3xl text-base leading-8 text-muted-foreground md:text-lg">
            This admin screen is for creating playlists and attaching published
            questions with explicit ordering.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/playlists">View playlists</Link>
            </Button>
          </div>
        </header>

        <Separator className="bg-border/60" />

        <AdminPlaylistForms
          createPlaylistAction={createPlaylistAction}
          linkQuestionsAction={linkQuestionsAction}
          playlists={safePlaylists}
          questions={safeQuestions}
        />

        <section className="space-y-4">
          <h2 className="font-serif text-2xl tracking-tight">
            Existing playlists
          </h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {safePlaylists.map((playlist) => (
              <li
                key={playlist.id}
                className="rounded-xl border border-border/70 bg-card/60 p-4 text-sm"
              >
                <p className="font-semibold">{playlist.title}</p>
                <p className="text-muted-foreground">/{playlist.slug}</p>
                <p className="mt-1 text-muted-foreground">
                  {playlist.playlist_type} - {playlist.access_level} -{" "}
                  {playlist.status} - sort #{playlist.sort_order}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </section>
    </main>
  );
}
