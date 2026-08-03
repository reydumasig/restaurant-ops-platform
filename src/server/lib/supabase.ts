import { createServerClient } from "@supabase/ssr";
import { getCookie, setCookie } from "hono/cookie";
import type { Context } from "hono";

/**
 * Builds a Supabase server client bound to the current Hono request/response,
 * so the API layer can verify sessions without depending on Next.js internals.
 */
export function createSupabaseServerClient(c: Context) {
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        const all = getCookie(c);
        return Object.entries(all).map(([name, value]) => ({ name, value }));
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          setCookie(c, name, value, options as Parameters<typeof setCookie>[3]);
        });
      },
    },
  });
}
