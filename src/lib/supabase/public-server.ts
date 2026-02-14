import { createClient } from "@supabase/supabase-js";

import { getSupabasePublicConfig } from "@/lib/supabase/config";

export function createSupabasePublicServerClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabasePublicConfig();

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
