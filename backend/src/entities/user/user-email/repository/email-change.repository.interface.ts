import { EmailChangeEntity } from '../email-change.entity';
import { UserEntity } from '../../user.entity';

export interface IEmailChangeRepository {
  findEmailChangeWithVerificationString(verificationString: string): Promise<EmailChangeEntity>;

  removeEmailChangeEntity(emailChangeEntity: EmailChangeEntity): Promise<EmailChangeEntity>;

  saveEmailChangeEntity(emailChangeEntity: EmailChangeEntity): Promise<EmailChangeEntity>;

  createOrUpdateEmailChangeEntity(user: UserEntity): Promise<EmailChangeEntity>;
}
