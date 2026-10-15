import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell } from '@/components/auth/auth-shell';
import { requireStaff } from '@/lib/auth/guards';
import { CAPABILITIES, CAPABILITY_LABELS, ROLE_LABELS, can } from '@/lib/auth/permissions';

export const metadata: Metadata = {
  title: 'Studio',
  robots: { index: false, follow: false },
};

export default async function StudioPage() {
  const { profile } = await requireStaff('/studio');
  const granted = CAPABILITIES.filter((capability) => can(profile.role, capability));

  return (
    <AuthShell
      kicker={ROLE_LABELS[profile.role]}
      title="Studio"
      lead={`Signed in as ${profile.display_name}. Your role grants the following.`}
      wide
    >
      <ul className="divide-y divide-rule border-y border-rule">
        {granted.map((capability) => (
          <li key={capability} className="py-3 text-base text-fg">
            {CAPABILITY_LABELS[capability]}
          </li>
        ))}
      </ul>
      <p className="mt-8 text-sm text-fg">
        <Link href="/account" className="font-semibold underline underline-offset-4">
          Account and sign out
        </Link>
      </p>
    </AuthShell>
  );
}
