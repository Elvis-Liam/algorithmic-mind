import 'server-only';
import { redirect } from 'next/navigation';
import { can, type Capability } from '@/lib/auth/permissions';
import { DEFAULT_LANDING, safeRedirectPath } from '@/lib/auth/redirects';
import { getAuthContext, type Profile } from '@/lib/auth/session';
import type { User } from '@supabase/supabase-js';

export interface ActiveContext {
  user: User;
  profile: Profile;
}

/** For pages and layouts. Redirects unless the visitor is signed in and active. */
export async function requireStaff(nextPath?: string): Promise<ActiveContext> {
  const ctx = await getAuthContext();
  if (!ctx) {
    const next = safeRedirectPath(nextPath, DEFAULT_LANDING);
    redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  }
  if (!ctx.profile) redirect('/access-denied?reason=no-profile');
  if (!ctx.profile.is_active) redirect('/access-denied?reason=pending');
  return { user: ctx.user, profile: ctx.profile };
}

/** For pages and layouts that need a specific capability. */
export async function requireCapability(
  capability: Capability,
  nextPath?: string,
): Promise<ActiveContext> {
  const ctx = await requireStaff(nextPath);
  if (!can(ctx.profile.role, capability)) redirect('/access-denied?reason=forbidden');
  return ctx;
}
