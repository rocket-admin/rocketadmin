import { UserEntity } from '../../user.entity.js';
import { PasswordResetEntity } from '../password-reset.entity.js';

export interface IPasswordResetRepository {
	findPasswordResetWidthVerificationString(verificationString: string): Promise<PasswordResetEntity>;

	removePasswordResetEntity(entity: PasswordResetEntity): Promise<PasswordResetEntity>;

	savePasswordResetEntity(entity: PasswordResetEntity): Promise<PasswordResetEntity>;

	createOrUpdatePasswordResetEntity(user: UserEntity): Promise<{ entity: PasswordResetEntity; rawToken: string }>;
}
