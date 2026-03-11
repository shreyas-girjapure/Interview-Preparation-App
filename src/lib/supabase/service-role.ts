import { createClient } from "@supabase/supabase-js";

import { getSupabaseServiceRoleConfig } from "@/lib/supabase/config";

let serviceRoleClientSingleton: ReturnType<typeof createClient> | null = null;

export function createSupabaseServiceRoleClient() {
  if (serviceRoleClientSingleton) {
    return serviceRoleClientSingleton;
  }

  const { serviceRoleKey, supabaseUrl } = getSupabaseServiceRoleConfig();
  serviceRoleClientSingleton = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return serviceRoleClientSingleton;
}
