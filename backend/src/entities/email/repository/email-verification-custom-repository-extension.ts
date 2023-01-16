import { Encryptor } from '../../../helpers/encryption/encryptor.js';
import { UserEntity } from '../../user/user.entity.js';
import { EmailVerificationEntity } from '../email-verification.entity.js';

export const emailVerificationRepositoryExtension = {
  async findVerificationWithVerificationString(verificationString: string): Promise<EmailVerificationEntity> {
    const qb = this.createQueryBuilder('email_verification')
      .leftJoinAndSelect('email_verification.user', 'user')
      .where('email_verification.verification_string = :ver_string', {
        ver_string: verificationString,
      });
    return await qb.getOne();
  },

  async removeVerificationEntity(verification: EmailVerificationEntity): Promise<EmailVerificationEntity> {
    return await this.remove(verification);
  },

  async createOrUpdateEmailVerification(user: UserEntity): Promise<EmailVerificationEntity> {
    if (!user.email_verification) {
      const newEmailVerification = new EmailVerificationEntity();
      newEmailVerification.verification_string = Encryptor.generateRandomString();
      newEmailVerification.user = user;
      return await this.save(newEmailVerification);
    }
    const foundEmailVerification = await this.findOne({ where: { id: user.email_verification.id } });
    await this.remove(foundEmailVerification);
    const newEmailVerification = new EmailVerificationEntity();
    newEmailVerification.verification_string = Encryptor.generateRandomString();
    newEmailVerification.user = user;
    return await this.save(newEmailVerification);
  },
};
