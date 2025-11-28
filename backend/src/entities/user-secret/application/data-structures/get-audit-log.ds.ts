import { SecretActionEnum } from '../../../secret-access-log/secret-access-log.entity.js';

export class GetAuditLogDS {
  userId: string;
  slug: string;
  page: number;
  limit: number;
}

export class AuditLogEntryDS {
  id: string;
  action: SecretActionEnum;
  user: {
    id: string;
    email: string;
  };
  accessedAt: Date;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
}

export class AuditLogListDS {
  data: AuditLogEntryDS[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
