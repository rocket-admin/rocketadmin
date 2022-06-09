import { PasswordResetEntity } from '../password-reset.entity';
import { UserEntity } from '../../user.entity';

export interface IPasswordResetRepository {
  findPasswordResetWidthVerificationString(verificationString: string): Promise<PasswordResetEntity>;

  removePasswordResetEntity(entity: PasswordResetEntity): Promise<PasswordResetEntity>;

  savePasswordResetEntity(entity: PasswordResetEntity): Promise<PasswordResetEntity>;

  createOrUpdatePasswordResetEntity(user: UserEntity): Promise<PasswordResetEntity>;
}
