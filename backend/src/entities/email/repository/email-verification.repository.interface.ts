import { UserEntity } from '../../user/user.entity.js';
import { EmailVerificationEntity } from '../email-verification.entity.js';

export interface IEmailVerificationRepository {
	findVerificationWithVerificationString(verificationString: string): Promise<EmailVerificationEntity>;

	removeVerificationEntity(verification: EmailVerificationEntity): Promise<EmailVerificationEntity>;

	createOrUpdateEmailVerification(user: UserEntity): Promise<{ entity: EmailVerificationEntity; rawToken: string }>;
}
