import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";
import type { Database } from "@/types/db";

/**
 * Server-side Supabase client using the service role key. Bypasses RLS. NEVER
 * import this from a client component. The `db.schema` option makes every
 * `.from("table")` call resolve against `dialer.<table>` automatically.
 */
let _client: SupabaseClient<Database, "dialer"> | null = null;

export function supabaseAdmin(): SupabaseClient<Database, "dialer"> {
  if (_client) return _client;
  _client = createClient<Database, "dialer">(
    serverEnv.SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
    {
      db: { schema: "dialer" },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          "X-Client-Info": "dialer-by-launchcraft/server",
        },
      },
    },
  );
  return _client;
}
