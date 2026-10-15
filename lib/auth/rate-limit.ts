import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

const WINDOW_SECONDS = 15 * 60;
const LIMIT_PER_EMAIL = 5;
const LIMIT_PER_IP = 20;

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

export type AttemptGate = 'allowed' | 'limited' | 'unavailable';

/**
 * Counts one password attempt against an email bucket and an IP bucket.
 * Fails closed: if the counter cannot be reached, the attempt is refused.
 * The email is hashed so the table holds no address.
 */
export async function gatePasswordAttempt(ip: string | null, email: string): Promise<AttemptGate> {
  const admin = createAdminClient();
  const emailHash = await sha256Hex(email);

  const [byEmail, byIp] = await Promise.all([
    admin.rpc('check_rate_limit', {
      p_bucket: `pw:email:${emailHash}`,
      p_limit: LIMIT_PER_EMAIL,
      p_window_seconds: WINDOW_SECONDS,
    }),
    admin.rpc('check_rate_limit', {
      p_bucket: `pw:ip:${ip ?? 'unknown'}`,
      p_limit: LIMIT_PER_IP,
      p_window_seconds: WINDOW_SECONDS,
    }),
  ]);

  if (byEmail.error || byIp.error) {
    console.error('rate limit check failed', byEmail.error?.code ?? byIp.error?.code);
    return 'unavailable';
  }
  return byEmail.data === true && byIp.data === true ? 'allowed' : 'limited';
}
