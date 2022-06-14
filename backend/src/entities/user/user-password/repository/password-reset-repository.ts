import { EntityRepository, getRepository, Repository } from 'typeorm';
import { PasswordResetEntity } from '../password-reset.entity';
import { IPasswordResetRepository } from './password-reset-repository.interface';
import { UserEntity } from '../../user.entity';
import { Encryptor } from '../../../../helpers/encryption/encryptor';

@EntityRepository(PasswordResetEntity)
export class PasswordResetRepository extends Repository<PasswordResetEntity> implements IPasswordResetRepository {
  constructor() {
    super();
  }

  public async findPasswordResetWidthVerificationString(verificationString: string): Promise<PasswordResetEntity> {
    const qb = await getRepository(PasswordResetEntity)
      .createQueryBuilder('password_reset')
      .leftJoinAndSelect('password_reset.user', 'user')
      .where('password_reset.verification_string = :ver_string', {
        ver_string: verificationString,
      });
    return await qb.getOne();
  }

  public async removePasswordResetEntity(entity: PasswordResetEntity): Promise<PasswordResetEntity> {
    return await this.remove(entity);
  }

  public async savePasswordResetEntity(entity: PasswordResetEntity): Promise<PasswordResetEntity> {
    return await this.save(entity);
  }

  public async createOrUpdatePasswordResetEntity(user: UserEntity): Promise<PasswordResetEntity> {
    const qb = await getRepository(PasswordResetEntity)
      .createQueryBuilder('password_reset')
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
  }
}
