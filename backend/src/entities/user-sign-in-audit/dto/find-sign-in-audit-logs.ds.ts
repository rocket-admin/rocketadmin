import { SignInMethodEnum } from '../enums/sign-in-method.enum.js';
import { SignInStatusEnum } from '../enums/sign-in-status.enum.js';

export class FindSignInAuditLogsDs {
  userId: string;
  companyId: string;
  query: {
    order?: string;
    page?: number;
    perPage?: number;
    dateFrom?: string;
    dateTo?: string;
    email?: string;
    status?: SignInStatusEnum;
    signInMethod?: SignInMethodEnum;
  };
}
