import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseEnv } from '@/lib/env';
import { hardenCookie } from '@/lib/supabase/cookies';

/** Request scoped client bound to the visitor's session. RLS applies as that user. */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = supabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, hardenCookie(options));
          }
        } catch {
          // Called from a Server Component, where cookies are read only.
          // middleware.ts refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}
