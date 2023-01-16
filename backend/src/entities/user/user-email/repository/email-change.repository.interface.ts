import { EmailChangeEntity } from '../email-change.entity.js';
import { UserEntity } from '../../user.entity.js';

export interface IEmailChangeRepository {
  findEmailChangeWithVerificationString(verificationString: string): Promise<EmailChangeEntity>;

  removeEmailChangeEntity(emailChangeEntity: EmailChangeEntity): Promise<EmailChangeEntity>;

  saveEmailChangeEntity(emailChangeEntity: EmailChangeEntity): Promise<EmailChangeEntity>;

  createOrUpdateEmailChangeEntity(user: UserEntity): Promise<EmailChangeEntity>;
}
