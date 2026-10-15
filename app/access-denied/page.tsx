import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell } from '@/components/auth/auth-shell';
import { SignOutButton } from '@/components/auth/sign-out-button';
import { getAuthContext } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'Access denied',
  robots: { index: false, follow: false },
};

const REASONS = new Map([
  [
    'pending',
    {
      title: 'Account waiting for activation',
      body: 'Your account exists, but an administrator has not activated it. Editorial access is granted by an administrator only. Ask one to activate your account, then sign in again.',
    },
  ],
  [
    'forbidden',
    {
      title: 'Your role cannot open this page',
      body: 'This area is not part of your role. If you need it, ask an administrator to review your role.',
    },
  ],
  [
    'no-profile',
    {
      title: 'Account not set up',
      body: 'We could not find a profile for this account. Contact an administrator and give them the email address you signed in with.',
    },
  ],
]);

export default async function AccessDeniedPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const content = (reason && REASONS.get(reason)) || REASONS.get('forbidden')!;
  const ctx = await getAuthContext();

  return (
    <AuthShell kicker="Access denied" title={content.title} lead={content.body}>
      <div className="flex flex-wrap items-center gap-6">
        {ctx ? (
          <SignOutButton />
        ) : (
          <Link
            href="/sign-in"
            className="inline-flex h-11 items-center rounded-sm bg-brand px-4 text-sm font-semibold text-bg"
          >
            Sign in
          </Link>
        )}
        <Link href="/" className="text-sm font-semibold text-fg underline underline-offset-4">
          Back to the front page
        </Link>
      </div>
    </AuthShell>
  );
}
