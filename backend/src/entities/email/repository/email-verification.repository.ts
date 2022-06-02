import { EntityRepository, getRepository, Repository } from 'typeorm';
import { EmailVerificationEntity } from '../email-verification.entity';
import { IEmailVerificationRepository } from './email-verification.repository.interface';
import { UserEntity } from '../../user/user.entity';
import { Encryptor } from '../../../helpers/encryption/encryptor';

@EntityRepository(EmailVerificationEntity)
export class EmailVerificationRepository
  extends Repository<EmailVerificationEntity>
  implements IEmailVerificationRepository
{
  constructor() {
    super();
  }

  public async findVerificationWithVerificationString(verificationString: string): Promise<EmailVerificationEntity> {
    const qb = await getRepository(EmailVerificationEntity)
      .createQueryBuilder('email_verification')
      .leftJoinAndSelect('email_verification.user', 'user')
      .where('email_verification.verification_string = :ver_string', {
        ver_string: verificationString,
      });
    return await qb.getOne();
  }

  public async removeVerificationEntity(verification: EmailVerificationEntity): Promise<EmailVerificationEntity> {
    return await this.remove(verification);
  }

  public async createOrUpdateEmailVerification(user: UserEntity): Promise<EmailVerificationEntity> {
    if (!user.email_verification) {
      const newEmailVerification = new EmailVerificationEntity();
      newEmailVerification.verification_string = Encryptor.generateRandomString();
      newEmailVerification.user = user;
      return await this.save(newEmailVerification);
    }
    const foundEmailVerification = await this.findOne(user.email_verification.id);
    await this.remove(foundEmailVerification);
    const newEmailVerification = new EmailVerificationEntity();
    newEmailVerification.verification_string = Encryptor.generateRandomString();
    newEmailVerification.user = user;
    return await this.save(newEmailVerification);
  }
}
