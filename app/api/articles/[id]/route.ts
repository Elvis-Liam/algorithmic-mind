import { json, isUuid } from '@/lib/api/http';
import { recordAuditEvent } from '@/lib/audit';
import { authorize } from '@/lib/auth/authorize';

type Context = { params: Promise<{ id: string }> };

// DELETE /api/articles/{id}                  soft delete (recoverable), editors and above
// DELETE /api/articles/{id}?permanent=true   hard delete, super administrators only
export async function DELETE(request: Request, { params }: Context) {
  const permanent = new URL(request.url).searchParams.get('permanent') === 'true';

  const auth = await authorize(request, permanent ? 'article:hard_delete' : 'article:delete');
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!isUuid(id)) return json({ error: 'invalid_id' }, 400);

  const { supabase, user } = auth;

  const query = permanent
    ? supabase.from('articles').delete().eq('id', id)
    : supabase
        .from('articles')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .is('deleted_at', null);

  const { data, error } = await query.select('id').maybeSingle();
  if (error) return json({ error: 'delete_failed' }, error.code === '42501' ? 403 : 500);
  if (!data) return json({ error: 'not_found' }, 404);

  await recordAuditEvent({
    actorId: user.id,
    action: permanent ? 'article.hard_delete' : 'article.delete',
    entityType: 'article',
    entityId: id,
  });

  return json({ deleted: id, permanent });
}
