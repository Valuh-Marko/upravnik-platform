import { AuditAction, Prisma } from '../prisma';

// Writes an AuditLog row with a JSON snapshot of the record (Decimals become strings).
export function audit(
  tx: Prisma.TransactionClient,
  performedBy: string,
  action: AuditAction,
  entityType: string,
  record: { id: string },
) {
  return tx.auditLog.create({
    data: {
      entityType,
      entityId: record.id,
      action,
      performedBy,
      snapshot: JSON.parse(JSON.stringify(record)) as Prisma.InputJsonValue,
    },
  });
}
