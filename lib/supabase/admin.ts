import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { supabaseEnv } from '@/lib/env';

/**
 * Service role client. Bypasses RLS. Server code only. Use it for the narrow
 * jobs that need it (audit writes, rate limit counters), never to answer a
 * request on behalf of a user.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY must be set');
  const { url } = supabaseEnv();
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
