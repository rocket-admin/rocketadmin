import { Encryptor } from '../../../../helpers/encryption/encryptor.js';
import { UserEntity } from '../../user.entity.js';
import { PasswordResetEntity } from '../password-reset.entity.js';

export const userPasswordResetCustomRepositoryExtension = {
  async findPasswordResetWidthVerificationString(verificationString: string): Promise<PasswordResetEntity> {
    const qb = this.createQueryBuilder('password_reset')
      .leftJoinAndSelect('password_reset.user', 'user')
      .where('password_reset.verification_string = :ver_string', {
        ver_string: verificationString,
      });
    return await qb.getOne();
  },

  async removePasswordResetEntity(entity: PasswordResetEntity): Promise<PasswordResetEntity> {
    return await this.remove(entity);
  },

  async savePasswordResetEntity(entity: PasswordResetEntity): Promise<PasswordResetEntity> {
    return await this.save(entity);
  },

  async createOrUpdatePasswordResetEntity(user: UserEntity): Promise<PasswordResetEntity> {
    const qb = this.createQueryBuilder('password_reset')
      .leftJoinAndSelect('password_reset.user', 'user')
      .where('user.id = :userId', { userId: user.id });
    const foundReset = await qb.getOne();
    if (foundReset) {
      await this.remove(foundReset);
    }
    const verificationString = Encryptor.generateRandomString();
    const newResetPasswordRequest = new PasswordResetEntity();
    newResetPasswordRequest.verification_string = verificationString;
    newResetPasswordRequest.user = user;
    return await this.save(newResetPasswordRequest);
  },
};
