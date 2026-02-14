export const APP_ROLES = ["admin", "editor", "user"] as const;

export type AppRole = (typeof APP_ROLES)[number];

export function isAppRole(value: string | null | undefined): value is AppRole {
  return APP_ROLES.includes(value as AppRole);
}

export function hasAdminAreaAccess(role: AppRole | null | undefined) {
  return role === "admin" || role === "editor";
}
