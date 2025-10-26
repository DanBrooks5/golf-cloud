'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Keep a single instance across hot reloads & files
const globalForSupabase = globalThis as unknown as {
  supabaseClient?: SupabaseClient;
};

export const supabaseBrowser = () => {
  if (!globalForSupabase.supabaseClient) {
    globalForSupabase.supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    );
  }
  return globalForSupabase.supabaseClient;
};
