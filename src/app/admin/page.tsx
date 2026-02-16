import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { requireAdminPageAccess } from "@/lib/auth/admin-access";

import { AdminContentComposer } from "./admin-content-composer";

export const dynamic = "force-dynamic";

type CategoryRelation =
  | {
      slug: string | null;
      name: string | null;
    }
  | Array<{
      slug: string | null;
      name: string | null;
    }>;

type SubcategoryRow = {
  id: string;
  slug: string;
  name: string;
  sort_order: number;
  categories: CategoryRelation | null;
};

type TopicSubcategoryRelation =
  | {
      slug: string | null;
      name: string | null;
      categories: CategoryRelation | null;
    }
  | Array<{
      slug: string | null;
      name: string | null;
      categories: CategoryRelation | null;
    }>;

type TopicRow = {
  id: string;
  slug: string;
  name: string;
  status: string | null;
  subcategories: TopicSubcategoryRelation | null;
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
    { data: subcategoriesData, error: subcategoriesError },
    { data: topicsData, error: topicsError },
  ] = await Promise.all([
    supabase
      .from("subcategories")
      .select("id, slug, name, sort_order, categories(slug, name)")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("topics")
      .select(
        "id, slug, name, status, subcategories(slug, name, categories(slug, name))",
      )
      .order("name", { ascending: true }),
  ]);

  if (subcategoriesError) {
    throw new Error(
      `Unable to load subcategories for admin page: ${subcategoriesError.message}`,
    );
  }

  if (topicsError) {
    throw new Error(
      `Unable to load topics for admin page: ${topicsError.message}`,
    );
  }

  const initialSubcategories = (
    (subcategoriesData as SubcategoryRow[] | null) ?? []
  ).map((subcategory) => {
    const category = pickSingle(subcategory.categories);
    return {
      id: subcategory.id,
      slug: subcategory.slug,
      name: subcategory.name,
      sortOrder: subcategory.sort_order,
      categorySlug: category?.slug ?? "",
      categoryName: category?.name ?? "",
    };
  });

  const initialTopics = ((topicsData as TopicRow[] | null) ?? []).map(
    (topic) => {
      const subcategory = pickSingle(topic.subcategories);
      const category = pickSingle(subcategory?.categories);
      return {
        id: topic.id,
        slug: topic.slug,
        name: topic.name,
        status: topic.status ?? "draft",
        subcategorySlug: subcategory?.slug ?? "",
        subcategoryName: subcategory?.name ?? "",
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
          initialSubcategories={initialSubcategories}
          initialTopics={initialTopics}
        />
      </section>
    </main>
  );
}
