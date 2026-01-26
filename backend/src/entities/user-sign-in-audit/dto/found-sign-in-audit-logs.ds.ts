import { ApiProperty } from '@nestjs/swagger';
import { PaginationDs } from '../../table/application/data-structures/pagination.ds.js';
import { FoundSignInAuditRecordDs } from './found-sign-in-audit-record.ds.js';

export class FoundSignInAuditLogsDs {
  @ApiProperty({ isArray: true, type: FoundSignInAuditRecordDs })
  logs: Array<FoundSignInAuditRecordDs>;

  @ApiProperty({ type: PaginationDs })
  pagination: PaginationDs;
}
