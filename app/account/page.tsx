import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell } from '@/components/auth/auth-shell';
import { SignOutButton } from '@/components/auth/sign-out-button';
import { requireStaff } from '@/lib/auth/guards';
import { ROLE_LABELS } from '@/lib/auth/permissions';

export const metadata: Metadata = {
  title: 'Account',
  robots: { index: false, follow: false },
};

const PROVIDER_LABELS = new Map([
  ['google', 'Google'],
  ['email', 'Email and password'],
]);

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="font-mono text-xs font-medium uppercase tracking-[0.1em] text-fg-muted">
        {label}
      </dt>
      <dd className="text-base text-fg">{value}</dd>
    </div>
  );
}

export default async function AccountPage() {
  const { user, profile } = await requireStaff('/account');

  const providers = Array.isArray(user.app_metadata?.providers)
    ? (user.app_metadata.providers as unknown[])
        .map((p) => PROVIDER_LABELS.get(String(p)) ?? String(p))
        .join(', ')
    : 'Unknown';
  const since = new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'UTC' }).format(
    new Date(user.created_at),
  );

  return (
    <AuthShell kicker="Account" title={profile.display_name} wide>
      <dl className="divide-y divide-rule border-y border-rule">
        <Row label="Email" value={user.email ?? 'Not set'} />
        <Row label="Role" value={ROLE_LABELS[profile.role]} />
        <Row label="Status" value="Active" />
        <Row label="Sign in method" value={providers} />
        <Row label="Account created" value={since} />
      </dl>
      <div className="mt-8 flex flex-wrap items-center gap-6">
        <SignOutButton />
        <Link href="/studio" className="text-sm font-semibold text-fg underline underline-offset-4">
          Go to the studio
        </Link>
      </div>
    </AuthShell>
  );
}
