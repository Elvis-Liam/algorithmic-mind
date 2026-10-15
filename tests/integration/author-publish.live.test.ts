import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Runs only against a real, scratch Supabase project and a running server:
//   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
//   SUPABASE_SERVICE_ROLE_KEY, TEST_BASE_URL (for example http://localhost:3000)
// Optional: TEST_ARTICLE_ID, an existing article, enables the direct write test.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const base = process.env.TEST_BASE_URL;
const articleId = process.env.TEST_ARTICLE_ID;
const enabled = Boolean(url && anon && service && base);

describe.skipIf(!enabled)('author cannot publish (live)', () => {
  const email = `phase3-author-${Date.now()}@example.test`;
  const password = `Pw-${crypto.randomUUID()}`;
  let admin: SupabaseClient;
  let author: SupabaseClient;
  let userId = '';
  let token = '';
  let initialProfile: { role: string; is_active: boolean } | null = null;

  beforeAll(async () => {
    admin = createClient(url!, service!, { auth: { persistSession: false } });
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error || !created.data.user) throw created.error ?? new Error('createUser failed');
    userId = created.data.user.id;

    const { data } = await admin.from('profiles').select('role, is_active').eq('id', userId).single();
    initialProfile = data as typeof initialProfile;

    // Service role bypasses the guard triggers, as documented in Phase 2.
    await admin.from('profiles').update({ role: 'author', is_active: true }).eq('id', userId);

    author = createClient(url!, anon!, { auth: { persistSession: false } });
    const signedIn = await author.auth.signInWithPassword({ email, password });
    if (signedIn.error || !signedIn.data.session) throw signedIn.error ?? new Error('sign in failed');
    token = signedIn.data.session.access_token;
  });

  afterAll(async () => {
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  it('a new account starts as an inactive reporter', () => {
    expect(initialProfile).toEqual({ role: 'reporter', is_active: false });
  });

  it('the publish endpoint returns 403 for the author own token', async () => {
    const res = await fetch(`${base}/api/articles/${articleId ?? crypto.randomUUID()}/publish`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(403);
  });

  it('an author cannot promote themselves through the data API', async () => {
    await author.from('profiles').update({ role: 'editor' }).eq('id', userId);
    const { data } = await admin.from('profiles').select('role').eq('id', userId).single();
    expect(data?.role).toBe('author');
  });

  it.skipIf(!articleId)('an author cannot publish through the data API either', async () => {
    const before = await admin.from('articles').select('status').eq('id', articleId!).single();
    await author.from('articles').update({ status: 'published' }).eq('id', articleId!);
    const after = await admin.from('articles').select('status').eq('id', articleId!).single();
    expect(after.data?.status).toBe(before.data?.status);
  });
});
