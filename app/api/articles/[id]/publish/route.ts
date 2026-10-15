import { json, isUuid } from '@/lib/api/http';
import { recordAuditEvent } from '@/lib/audit';
import { authorize } from '@/lib/auth/authorize';

type Context = { params: Promise<{ id: string }> };

// POST /api/articles/{id}/publish
// Capability check first, on the server, from the caller's credential alone.
// The update then runs through the caller's own client, so RLS and the Phase 2
// privileged column guard apply a second time.
export async function POST(request: Request, { params }: Context) {
  const auth = await authorize(request, 'article:publish');
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!isUuid(id)) return json({ error: 'invalid_id' }, 400);

  const { supabase, user } = auth;

  const { data: article, error: readError } = await supabase
    .from('articles')
    .select('id, status')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();
  if (readError) return json({ error: 'server_error' }, 500);
  if (!article) return json({ error: 'not_found' }, 404);
  if (article.status === 'published') return json({ error: 'already_published' }, 409);

  const { data: updated, error: updateError } = await supabase
    .from('articles')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', article.status)
    .select('id, status, published_at')
    .maybeSingle();
  if (updateError) return json({ error: 'update_failed' }, updateError.code === '42501' ? 403 : 500);
  if (!updated) return json({ error: 'conflict' }, 409);

  await recordAuditEvent({
    actorId: user.id,
    action: 'article.publish',
    entityType: 'article',
    entityId: id,
    metadata: { from_status: article.status },
  });

  return json({ article: updated });
}
