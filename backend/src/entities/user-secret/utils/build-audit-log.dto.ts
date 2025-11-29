import { AuditLogResponseDto, AuditLogEntryDto } from '../application/dto/audit-log.dto.js';
import { AuditLogListDS, AuditLogEntryDS } from '../application/data-structures/get-audit-log.ds.js';

export function buildAuditLogEntryDto(ds: AuditLogEntryDS): AuditLogEntryDto {
  return {
    id: ds.id,
    action: ds.action,
    user: ds.user,
    accessedAt: ds.accessedAt,
    ipAddress: ds.ipAddress,
    userAgent: ds.userAgent,
    success: ds.success,
    errorMessage: ds.errorMessage,
  };
}

export function buildAuditLogResponseDto(ds: AuditLogListDS): AuditLogResponseDto {
  return {
    data: ds.data.map(buildAuditLogEntryDto),
    pagination: ds.pagination,
  };
}
