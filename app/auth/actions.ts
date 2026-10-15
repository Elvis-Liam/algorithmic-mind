'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { recordAuditEvent } from '@/lib/audit';
import { landingPathFor } from '@/lib/auth/permissions';
import { gatePasswordAttempt } from '@/lib/auth/rate-limit';
import { DEFAULT_LANDING, safeRedirectPath } from '@/lib/auth/redirects';
import { fetchProfile } from '@/lib/auth/session';
import { siteUrl } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function signInWithGoogleAction(formData: FormData): Promise<void> {
  const next = safeRedirectPath(formData.get('next'), DEFAULT_LANDING);
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
      queryParams: { prompt: 'select_account' },
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) redirect('/sign-in?error=oauth');
  redirect(data.url);
}

export async function signInWithPasswordAction(formData: FormData): Promise<void> {
  const next = safeRedirectPath(formData.get('next'), DEFAULT_LANDING);
  const back = (code: string): never =>
    redirect(`/sign-in?error=${code}&next=${encodeURIComponent(next)}`);

  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  if (!EMAIL_RE.test(email) || email.length > 254 || password.length < 1 || password.length > 128) {
    return back('invalid');
  }

  const h = await headers();
  const ip = h.get('cf-connecting-ip') ?? h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;

  const gate = await gatePasswordAttempt(ip, email);
  if (gate === 'limited') return back('rate');
  if (gate === 'unavailable') return back('unavailable');

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    const clientError = error?.status !== undefined && error.status >= 400 && error.status < 500;
    return back(clientError ? 'invalid' : 'unavailable');
  }

  const profile = await fetchProfile(supabase, data.user.id);
  if (!profile) redirect('/access-denied?reason=no-profile');
  if (!profile.is_active) redirect('/access-denied?reason=pending');

  await recordAuditEvent({
    actorId: data.user.id,
    action: 'auth.sign_in',
    entityType: 'session',
    entityId: data.user.id,
    metadata: { provider: 'email' },
  });

  redirect(next === DEFAULT_LANDING ? landingPathFor(profile.role) : next);
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: 'local' });
  redirect('/sign-in');
}
