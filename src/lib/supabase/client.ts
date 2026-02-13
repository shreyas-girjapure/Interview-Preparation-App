"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabasePublicConfig } from "@/lib/supabase/config";

let supabaseBrowserClient: SupabaseClient | undefined;

export function createSupabaseBrowserClient() {
  if (supabaseBrowserClient) {
    return supabaseBrowserClient;
  }

  const { supabaseUrl, supabaseAnonKey } = getSupabasePublicConfig();
  supabaseBrowserClient = createBrowserClient(supabaseUrl, supabaseAnonKey);

  return supabaseBrowserClient;
}
