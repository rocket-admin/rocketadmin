import { SignInAuditEntity } from '../sign-in-audit.entity.js';
import { FoundSignInAuditRecordDs } from '../dto/found-sign-in-audit-record.ds.js';

export function buildFoundSignInAuditRecordDs(entity: SignInAuditEntity): FoundSignInAuditRecordDs {
  return {
    id: entity.id,
    email: entity.email,
    status: entity.status,
    signInMethod: entity.signInMethod,
    ipAddress: entity.ipAddress,
    userAgent: entity.userAgent,
    failureReason: entity.failureReason,
    createdAt: entity.createdAt,
    userId: entity.user?.id || null,
  };
}
