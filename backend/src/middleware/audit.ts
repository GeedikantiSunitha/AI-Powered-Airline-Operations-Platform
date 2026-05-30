/**
 * Phase 1, 8, 9, 15 — Audit logging with trace chains
 */
import { randomUUID } from 'crypto';

export type AuditCategory = 'user' | 'ai' | 'model' | 'security' | 'system';

export interface AuditEntry {
  traceId?: string;
  category?: AuditCategory;
  userId?: string;
  action: string;
  resource?: string;
  metadata?: Record<string, unknown>;
}

const auditBuffer: Array<AuditEntry & { at: string }> = [];

export function createTraceId(): string {
  return randomUUID();
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  const payload = {
    ...entry,
    traceId: entry.traceId ?? createTraceId(),
    category: entry.category ?? 'system',
    at: new Date().toISOString(),
  };
  auditBuffer.push(payload);
  if (auditBuffer.length > 2000) auditBuffer.pop();
  console.log('[audit]', JSON.stringify(payload));

  void import('../services/admin/adminPersistence')
    .then(({ adminPersistence }) =>
      adminPersistence.persistAudit({
        traceId: payload.traceId,
        category: payload.category,
        userId: payload.userId,
        action: payload.action,
        resource: payload.resource,
        metadata: payload.metadata,
        at: payload.at,
      })
    )
    .catch(() => {
      /* persistence optional */
    });
}

export function getAuditEvents(): Array<AuditEntry & { at: string; traceId: string; category: AuditCategory }> {
  return auditBuffer.map((entry) => ({
    ...entry,
    traceId: entry.traceId ?? 'unknown',
    category: entry.category ?? 'system',
  }));
}

export function getAuditChain(traceId: string): Array<AuditEntry & { at: string; traceId: string; category: AuditCategory }> {
  return getAuditEvents()
    .filter((entry) => entry.traceId === traceId)
    .sort((a, b) => a.at.localeCompare(b.at));
}
