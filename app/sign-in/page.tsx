import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { signInWithGoogleAction, signInWithPasswordAction } from '@/app/auth/actions';
import { AuthShell } from '@/components/auth/auth-shell';
import { FormField } from '@/components/auth/form-field';
import { GoogleButton } from '@/components/auth/google-button';
import { landingPathFor } from '@/lib/auth/permissions';
import { DEFAULT_LANDING, safeRedirectPath } from '@/lib/auth/redirects';
import { getAuthContext } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
};

// A Map, not an object, so a query value such as "constructor" cannot match.
const MESSAGES = new Map<string, string>([
  ['invalid', 'The email or password is incorrect.'],
  ['rate', 'Too many attempts. Wait 15 minutes, then try again.'],
  ['unavailable', 'Sign in is temporarily unavailable. Try again in a few minutes.'],
  ['oauth', 'Google sign in did not complete. Try again.'],
]);

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  const safeNext = safeRedirectPath(next, DEFAULT_LANDING);

  const ctx = await getAuthContext();
  if (ctx?.profile?.is_active) {
    redirect(safeNext === DEFAULT_LANDING ? landingPathFor(ctx.profile.role) : safeNext);
  }
  if (ctx) redirect(`/access-denied?reason=${ctx.profile ? 'pending' : 'no-profile'}`);

  const message = error ? MESSAGES.get(error) : undefined;

  return (
    <AuthShell
      kicker="Staff access"
      title="Sign in"
      lead="The studio is for Algorithmic Mind editorial staff. Use your Google account, or your email and password if you do not have one."
    >
      {message ? (
        <p role="alert" className="mb-6 border-l-2 border-accent pl-3 text-sm text-fg">
          <span className="mr-2 font-mono text-xs font-medium uppercase tracking-[0.1em]">Error</span>
          {message}
        </p>
      ) : null}

      <form action={signInWithGoogleAction}>
        <input type="hidden" name="next" value={safeNext} />
        <GoogleButton />
      </form>

      <div className="my-8 flex items-center gap-4">
        <span aria-hidden="true" className="h-px flex-1 bg-rule" />
        <span className="font-mono text-xs font-medium uppercase tracking-[0.1em] text-fg-muted">
          Email and password
        </span>
        <span aria-hidden="true" className="h-px flex-1 bg-rule" />
      </div>

      <form action={signInWithPasswordAction} className="space-y-5">
        <input type="hidden" name="next" value={safeNext} />
        <FormField id="email" label="Email" type="email" autoComplete="email" maxLength={254} />
        <FormField
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          maxLength={128}
        />
        <button
          type="submit"
          className="h-11 w-full rounded-sm bg-brand px-4 text-sm font-semibold text-bg hover:opacity-90"
        >
          Sign in
        </button>
      </form>
    </AuthShell>
  );
}
