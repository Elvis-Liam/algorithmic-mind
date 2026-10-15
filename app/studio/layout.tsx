import type { ReactNode } from 'react';
import { requireStaff } from '@/lib/auth/guards';

// Every route under /studio inherits this guard. Middleware only checks that a
// session exists. This layout checks the profile is active and loaded.
export default async function StudioLayout({ children }: { children: ReactNode }) {
  await requireStaff('/studio');
  return children;
}
