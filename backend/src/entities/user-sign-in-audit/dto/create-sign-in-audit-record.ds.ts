import { SignInMethodEnum } from '../enums/sign-in-method.enum.js';
import { SignInStatusEnum } from '../enums/sign-in-status.enum.js';

export class CreateSignInAuditRecordDs {
  email: string;
  userId?: string;
  status: SignInStatusEnum;
  signInMethod: SignInMethodEnum;
  ipAddress?: string;
  userAgent?: string;
  failureReason?: string;
}
