import type { ReactNode } from 'react';
import { requireCapability } from '@/lib/auth/guards';

// Every route under /admin inherits this guard, including pages added later.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireCapability('admin:access', '/admin');
  return children;
}
