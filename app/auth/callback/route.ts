import { NextResponse } from 'next/server';
import { recordAuditEvent } from '@/lib/audit';
import { landingPathFor } from '@/lib/auth/permissions';
import { DEFAULT_LANDING, safeRedirectPath } from '@/lib/auth/redirects';
import { fetchProfile } from '@/lib/auth/session';
import { siteUrl } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';

// OAuth return point. The destination is rebuilt from the configured site
// origin plus an allowlisted path, so no request header or query parameter can
// send the browser to another host.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const origin = siteUrl();
  const to = (path: string) => NextResponse.redirect(new URL(path, origin), 303);

  const code = params.get('code');
  if (!code || params.get('error')) return to('/sign-in?error=oauth');

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return to('/sign-in?error=oauth');

  const profile = await fetchProfile(supabase, data.user.id);
  if (!profile) return to('/access-denied?reason=no-profile');
  if (!profile.is_active) return to('/access-denied?reason=pending');

  await recordAuditEvent({
    actorId: data.user.id,
    action: 'auth.sign_in',
    entityType: 'session',
    entityId: data.user.id,
    metadata: { provider: 'google' },
  });

  const next = safeRedirectPath(params.get('next'), DEFAULT_LANDING);
  return to(next === DEFAULT_LANDING ? landingPathFor(profile.role) : next);
}
