import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

export type AuditAction =
  | 'auth.sign_in'
  | 'user.role_change'
  | 'user.activation_change'
  | 'article.publish'
  | 'article.delete'
  | 'article.hard_delete';

export interface AuditEvent {
  actorId: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Writes a semantic audit event through the service role. Best effort: a
 * failure is logged and returned as false, it never blocks the user. The field
 * level diffs from the Phase 2 triggers are written atomically with the change
 * and are the backstop if this call fails. No IP address or user agent is stored.
 */
export async function recordAuditEvent(event: AuditEvent): Promise<boolean> {
  try {
    const { error } = await createAdminClient().rpc('record_audit_event', {
      p_actor_id: event.actorId,
      p_action: event.action,
      p_entity_type: event.entityType,
      p_entity_id: event.entityId ?? null,
      p_metadata: event.metadata ?? {},
    });
    if (error) {
      console.error('audit write failed', event.action, error.code);
      return false;
    }
    return true;
  } catch (err) {
    console.error('audit write threw', event.action, err instanceof Error ? err.name : 'unknown');
    return false;
  }
}
