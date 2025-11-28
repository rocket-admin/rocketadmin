import { SecretAccessLogEntity } from '../../secret-access-log/secret-access-log.entity.js';
import { AuditLogEntryDS } from '../application/data-structures/get-audit-log.ds.js';

export function buildAuditLogEntryDS(log: SecretAccessLogEntity): AuditLogEntryDS {
  return {
    id: log.id,
    action: log.action,
    user: {
      id: log.user.id,
      email: log.user.email,
    },
    accessedAt: log.accessedAt,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    success: log.success,
    errorMessage: log.errorMessage,
  };
}
