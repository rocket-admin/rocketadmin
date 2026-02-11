import { AuditLogEntryDS, AuditLogListDS } from '../application/data-structures/get-audit-log.ds.js';
import { AuditLogEntryDto, AuditLogResponseDto } from '../application/dto/audit-log.dto.js';

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
