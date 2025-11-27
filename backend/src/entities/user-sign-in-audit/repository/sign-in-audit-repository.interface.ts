import { QueryOrderingEnum } from '../../../enums/query-ordering.enum.js';
import { SignInMethodEnum } from '../enums/sign-in-method.enum.js';
import { SignInStatusEnum } from '../enums/sign-in-status.enum.js';
import { CreateSignInAuditRecordDs } from '../dto/create-sign-in-audit-record.ds.js';
import { SignInAuditEntity } from '../sign-in-audit.entity.js';

export interface ISignInAuditRepository {
  createSignInAuditRecord(data: CreateSignInAuditRecordDs): Promise<SignInAuditEntity>;

  findSignInAuditLogs(options: IFindSignInAuditLogsOptions): Promise<IFoundSignInAuditLogsResult>;

  findSignInAuditLogsByUserId(
    userId: string,
    options: IFindSignInAuditLogsOptions,
  ): Promise<IFoundSignInAuditLogsResult>;
}

export interface IFindSignInAuditLogsOptions {
  companyId: string;
  order: QueryOrderingEnum;
  page: number;
  perPage: number;
  dateFrom?: Date;
  dateTo?: Date;
  searchedEmail?: string;
  status?: SignInStatusEnum;
  signInMethod?: SignInMethodEnum;
}

export interface IFoundSignInAuditLogsResult {
  logs: Array<SignInAuditEntity>;
  pagination: {
    currentPage: number;
    lastPage: number;
    perPage: number;
    total: number;
  };
}
