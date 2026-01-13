import { InTransactionEnum } from '../../../enums/index.js';
import { FindSignInAuditLogsDs } from '../dto/find-sign-in-audit-logs.ds.js';
import { FoundSignInAuditLogsDs } from '../dto/found-sign-in-audit-logs.ds.js';

export interface IFindSignInAuditLogs {
  execute(inputData: FindSignInAuditLogsDs, inTransaction: InTransactionEnum): Promise<FoundSignInAuditLogsDs>;
}
