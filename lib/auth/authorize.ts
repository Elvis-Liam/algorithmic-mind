import 'server-only';
import { createClient as createSupabaseClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { json } from '@/lib/api/http';
import { can, type Capability } from '@/lib/auth/permissions';
import { fetchProfile, type Profile } from '@/lib/auth/session';
import { siteUrl, supabaseEnv } from '@/lib/env';
import { createClient as createCookieClient } from '@/lib/supabase/server';

export type AuthorizeResult =
  | { ok: true; user: User; profile: Profile; supabase: SupabaseClient }
  | { ok: false; response: Response };

const deny = (status: 401 | 403, error: string): AuthorizeResult => ({
  ok: false,
  response: json({ error }, status),
});

function bearerToken(request: Request): string | null {
  const header = request.headers.get('authorization');
  if (!header || !header.toLowerCase().startsWith('bearer ')) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

/** Cookie authenticated writes must come from our own origin (CSRF defence). */
function originAllowed(request: Request): boolean {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return true;
  return request.headers.get('origin') === siteUrl();
}

/**
 * The server side permission check for every API route. It does not look at
 * anything the interface sent except the credential. Accepts the session
 * cookie or an `Authorization: Bearer <access token>` header. The returned
 * client is bound to the caller, so RLS and the Phase 2 guard triggers remain
 * a second, independent gate behind this one.
 */
export async function authorize(request: Request, capability: Capability): Promise<AuthorizeResult> {
  let supabase: SupabaseClient;
  let user: User | null;

  const token = bearerToken(request);
  if (token) {
    const { url, anonKey } = supabaseEnv();
    supabase = createSupabaseClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    user = (await supabase.auth.getUser(token)).data.user;
  } else {
    if (!originAllowed(request)) return deny(403, 'forbidden');
    supabase = await createCookieClient();
    user = (await supabase.auth.getUser()).data.user;
  }

  if (!user) return deny(401, 'unauthenticated');

  const profile = await fetchProfile(supabase, user.id);
  if (!profile || !profile.is_active || !can(profile.role, capability)) {
    return deny(403, 'forbidden');
  }
  return { ok: true, user, profile, supabase };
}
