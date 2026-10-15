import { beforeEach, describe, expect, it, vi } from 'vitest';

// Proves the server rejects on its own. The interface is not involved at all:
// the handler is called directly with a bearer token, which is what a caller
// holding an author's session token would do.

const state = vi.hoisted(() => ({
  user: null as null | { id: string },
  queues: {} as Record<string, unknown[]>,
  tables: [] as string[],
  audit: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: state.user }, error: null }) },
    from: (table: string) => {
      state.tables.push(table);
      return builder(table);
    },
  }),
}));

vi.mock('@/lib/audit', () => ({ recordAuditEvent: state.audit }));

function builder(table: string) {
  const b: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'is', 'update', 'delete']) b[method] = () => b;
  b.maybeSingle = async () => ({ data: state.queues[table]?.shift() ?? null, error: null });
  return b;
}

import { POST } from '@/app/api/articles/[id]/publish/route';

const ARTICLE_ID = '3f2c1d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f';
const call = (id = ARTICLE_ID) =>
  POST(
    new Request(`http://localhost/api/articles/${id}/publish`, {
      method: 'POST',
      headers: { authorization: 'Bearer test-token' },
    }),
    { params: Promise.resolve({ id }) },
  );

const profile = (role: string, is_active = true) => ({
  id: 'user-1',
  display_name: 'Test',
  slug: 'test-user1',
  role,
  is_active,
});

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost:54321');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-test-key');
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'http://localhost:3000');
  state.user = { id: 'user-1' };
  state.queues = {};
  state.tables = [];
  state.audit.mockReset();
});

describe('POST /api/articles/{id}/publish', () => {
  it('returns 401 with no valid user', async () => {
    state.user = null;
    expect((await call()).status).toBe(401);
    expect(state.tables).not.toContain('articles');
  });

  it.each(['author', 'reporter'])('returns 403 for an active %s and never touches articles', async (role) => {
    state.queues.profiles = [profile(role)];
    const res = await call();
    expect(res.status).toBe(403);
    expect(state.tables).not.toContain('articles');
    expect(state.audit).not.toHaveBeenCalled();
  });

  it('returns 403 for an inactive editor', async () => {
    state.queues.profiles = [profile('editor', false)];
    expect((await call()).status).toBe(403);
    expect(state.tables).not.toContain('articles');
  });

  it('returns 403 when the profile row cannot be read', async () => {
    state.queues.profiles = [];
    expect((await call()).status).toBe(403);
  });

  it('rejects an author before it even validates the id', async () => {
    state.queues.profiles = [profile('author')];
    expect((await call('not-a-uuid')).status).toBe(403);
  });

  it('returns 400 for a malformed id when the caller is allowed', async () => {
    state.queues.profiles = [profile('editor')];
    expect((await call('not-a-uuid')).status).toBe(400);
  });

  it('publishes for an editor and writes an audit event', async () => {
    state.queues.profiles = [profile('editor')];
    state.queues.articles = [
      { id: ARTICLE_ID, status: 'review' },
      { id: ARTICLE_ID, status: 'published', published_at: '2026-10-12T00:00:00.000Z' },
    ];
    const res = await call();
    expect(res.status).toBe(200);
    expect(state.audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'article.publish', entityId: ARTICLE_ID, actorId: 'user-1' }),
    );
  });

  it('refuses cookie authenticated writes from a foreign origin', async () => {
    const res = await POST(
      new Request(`http://localhost/api/articles/${ARTICLE_ID}/publish`, {
        method: 'POST',
        headers: { origin: 'https://evil.example' },
      }),
      { params: Promise.resolve({ id: ARTICLE_ID }) },
    );
    expect(res.status).toBe(403);
  });
});
