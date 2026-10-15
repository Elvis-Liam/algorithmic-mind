import { json, isUuid, readJsonObject } from '@/lib/api/http';
import { recordAuditEvent } from '@/lib/audit';
import { authorize } from '@/lib/auth/authorize';
import { canAssignRole, isRole } from '@/lib/auth/permissions';

type Context = { params: Promise<{ id: string }> };

// PATCH /api/admin/users/{id}   body: { "role"?: Role, "is_active"?: boolean }
// The only path in the application that changes a role or activates an
// account. Self service is refused here and again by the Phase 2 triggers.
export async function PATCH(request: Request, { params }: Context) {
  const auth = await authorize(request, 'user:manage');
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!isUuid(id)) return json({ error: 'invalid_id' }, 400);

  const body = await readJsonObject(request);
  if (!body) return json({ error: 'invalid_body' }, 400);
  const unknownKeys = Object.keys(body).filter((k) => k !== 'role' && k !== 'is_active');
  if (unknownKeys.length > 0) return json({ error: 'invalid_body' }, 400);
  if ('role' in body && !isRole(body.role)) return json({ error: 'invalid_role' }, 400);
  if ('is_active' in body && typeof body.is_active !== 'boolean') {
    return json({ error: 'invalid_is_active' }, 400);
  }
  if (!('role' in body) && !('is_active' in body)) return json({ error: 'invalid_body' }, 400);

  const { supabase, user, profile: actor } = auth;
  if (id === user.id) return json({ error: 'cannot_modify_own_account' }, 403);

  const { data: row, error: readError } = await supabase
    .from('profiles')
    .select('id, role, is_active')
    .eq('id', id)
    .maybeSingle();
  if (readError) return json({ error: 'server_error' }, 500);
  if (!row || !isRole(row.role)) return json({ error: 'not_found' }, 404);

  const currentRole = row.role;
  const nextRole = 'role' in body ? (body.role as typeof currentRole) : currentRole;
  const nextActive = 'is_active' in body ? (body.is_active as boolean) : row.is_active === true;

  if (!canAssignRole(actor.role, currentRole, nextRole)) return json({ error: 'forbidden' }, 403);

  const roleChanged = nextRole !== currentRole;
  const activeChanged = nextActive !== (row.is_active === true);
  if (!roleChanged && !activeChanged) return json({ profile: row });

  const patch: Record<string, unknown> = {};
  if (roleChanged) patch.role = nextRole;
  if (activeChanged) patch.is_active = nextActive;

  const { data: updated, error: updateError } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', id)
    .select('id, role, is_active')
    .maybeSingle();
  if (updateError) return json({ error: 'update_failed' }, updateError.code === '42501' ? 403 : 500);
  if (!updated) return json({ error: 'forbidden' }, 403); // RLS filtered the row

  if (roleChanged) {
    await recordAuditEvent({
      actorId: user.id,
      action: 'user.role_change',
      entityType: 'profile',
      entityId: id,
      metadata: { from: currentRole, to: nextRole },
    });
  }
  if (activeChanged) {
    await recordAuditEvent({
      actorId: user.id,
      action: 'user.activation_change',
      entityType: 'profile',
      entityId: id,
      metadata: { from: row.is_active === true, to: nextActive },
    });
  }

  return json({ profile: updated });
}
