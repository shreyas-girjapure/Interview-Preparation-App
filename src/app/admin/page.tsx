import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { requireAdminPageAccess } from "@/lib/auth/admin-access";

import { AdminContentComposer } from "./admin-content-composer";

export const dynamic = "force-dynamic";

type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  sort_order: number;
};

type TopicCategoryRelation =
  | {
      slug: string | null;
      name: string | null;
    }
  | Array<{
      slug: string | null;
      name: string | null;
    }>;

type TopicRow = {
  id: string;
  slug: string;
  name: string;
  status: string | null;
  categories: TopicCategoryRelation | null;
};

function pickSingle<T>(value: T | T[] | null | undefined): T | null {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function AdminPage() {
  const { supabase } = await requireAdminPageAccess("/admin");

  const [
    { data: categoriesData, error: categoriesError },
    { data: topicsData, error: topicsError },
  ] = await Promise.all([
    supabase
      .from("categories")
      .select("id, slug, name, sort_order")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("topics")
      .select("id, slug, name, status, categories(slug, name)")
      .order("name", { ascending: true }),
  ]);

  if (categoriesError) {
    throw new Error(
      `Unable to load categories for admin page: ${categoriesError.message}`,
    );
  }

  if (topicsError) {
    throw new Error(
      `Unable to load topics for admin page: ${topicsError.message}`,
    );
  }

  const initialCategories = (
    (categoriesData as CategoryRow[] | null) ?? []
  ).map((category) => ({
    id: category.id,
    slug: category.slug,
    name: category.name,
    sortOrder: category.sort_order,
  }));

  const initialTopics = ((topicsData as TopicRow[] | null) ?? []).map(
    (topic) => {
      const category = pickSingle(topic.categories);
      return {
        id: topic.id,
        slug: topic.slug,
        name: topic.name,
        status: topic.status ?? "draft",
        categorySlug: category?.slug ?? "",
        categoryName: category?.name ?? "",
      };
    },
  );

  return (
    <main className="min-h-screen bg-[oklch(0.985_0.004_95)]">
      <section className="mx-auto w-full max-w-7xl px-6 py-12 md:px-10 md:py-16">
        <header className="space-y-4">
          <Badge
            variant="secondary"
            className="rounded-full px-3 py-1 text-xs tracking-wide uppercase"
          >
            Admin
          </Badge>
          <h1 className="font-serif text-4xl leading-tight tracking-tight md:text-5xl">
            Manual content composer
          </h1>
          <p className="max-w-4xl text-base leading-8 text-muted-foreground md:text-lg">
            Select an existing topic or create one, then write a question and
            answer with live preview before publishing.
          </p>
        </header>

        <Separator className="my-8" />

        <AdminContentComposer
          initialCategories={initialCategories}
          initialTopics={initialTopics}
        />
      </section>
    </main>
  );
}
