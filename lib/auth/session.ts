import 'server-only';
import { cache } from 'react';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { isRole, type Role } from '@/lib/auth/permissions';
import { createClient } from '@/lib/supabase/server';

export interface Profile {
  id: string;
  display_name: string;
  slug: string;
  role: Role;
  is_active: boolean;
}

export interface AuthContext {
  user: User;
  profile: Profile | null;
}

/** Reads the caller's own profile through whichever client is passed (RLS applies). */
export async function fetchProfile(supabase: SupabaseClient, id: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('id, display_name, slug, role, is_active')
    .eq('id', id)
    .maybeSingle();
  const row = data as Record<string, unknown> | null;
  if (!row || !isRole(row.role)) return null;
  return {
    id: String(row.id),
    display_name: String(row.display_name ?? ''),
    slug: String(row.slug ?? ''),
    role: row.role,
    is_active: row.is_active === true,
  };
}

/** Verified user plus profile, once per request. Null when signed out. */
export const getAuthContext = cache(async (): Promise<AuthContext | null> => {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return { user, profile: await fetchProfile(supabase, user.id) };
});
