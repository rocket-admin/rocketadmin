import { UserEntity } from '../../user.entity.js';
import { EmailChangeEntity } from '../email-change.entity.js';

export interface IEmailChangeRepository {
	findEmailChangeWithVerificationString(verificationString: string): Promise<EmailChangeEntity>;

	removeEmailChangeEntity(emailChangeEntity: EmailChangeEntity): Promise<EmailChangeEntity>;

	saveEmailChangeEntity(emailChangeEntity: EmailChangeEntity): Promise<EmailChangeEntity>;

	createOrUpdateEmailChangeEntity(user: UserEntity): Promise<{ entity: EmailChangeEntity; rawToken: string }>;
}
