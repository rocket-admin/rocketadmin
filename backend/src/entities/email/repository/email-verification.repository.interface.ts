import { EmailVerificationEntity } from '../email-verification.entity';
import { UserEntity } from '../../user/user.entity';

export interface IEmailVerificationRepository {
  findVerificationWithVerificationString(verificationString: string): Promise<EmailVerificationEntity>;

  removeVerificationEntity(verification: EmailVerificationEntity): Promise<EmailVerificationEntity>;

  createOrUpdateEmailVerification(user: UserEntity): Promise<EmailVerificationEntity>;
}
