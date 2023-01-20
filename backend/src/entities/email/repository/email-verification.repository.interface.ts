import { EmailVerificationEntity } from '../email-verification.entity.js';
import { UserEntity } from '../../user/user.entity.js';

export interface IEmailVerificationRepository {
  findVerificationWithVerificationString(verificationString: string): Promise<EmailVerificationEntity>;

  removeVerificationEntity(verification: EmailVerificationEntity): Promise<EmailVerificationEntity>;

  createOrUpdateEmailVerification(user: UserEntity): Promise<EmailVerificationEntity>;
}
