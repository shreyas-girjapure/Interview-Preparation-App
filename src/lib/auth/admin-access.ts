import type { SupabaseClient, User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { hasAdminAreaAccess, isAppRole, type AppRole } from "@/lib/auth/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type UserRoleRow = {
  role: string | null;
};

export async function getUserRole(
  supabase: SupabaseClient,
  userId: string,
): Promise<AppRole | null> {
  const { data, error } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .maybeSingle<UserRoleRow>();

  if (error || !isAppRole(data?.role)) {
    return null;
  }

  return data.role;
}

export async function requireAdminPageAccess(nextPath: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  const role = await getUserRole(supabase, user.id);

  if (!hasAdminAreaAccess(role)) {
    redirect("/unauthorized?reason=admin");
  }

  return {
    supabase,
    user,
    role,
  };
}

export function hasAdminAccessForRole(role: AppRole | null) {
  return hasAdminAreaAccess(role);
}

export type AuthenticatedAdmin = {
  user: User;
  role: AppRole;
};
