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

	async createOrUpdateEmailVerification(
		user: UserEntity,
	): Promise<{ entity: EmailVerificationEntity; rawToken: string }> {
		if (!user.email_verification) {
			const rawToken = Encryptor.generateRandomString();
			const newEmailVerification = new EmailVerificationEntity();
			newEmailVerification.verification_string = Encryptor.hashVerificationToken(rawToken);
			newEmailVerification.user = user;
			const entity = await this.save(newEmailVerification);
			return { entity, rawToken };
		}
		const foundEmailVerification = await this.findOne({ where: { id: user.email_verification.id } });
		await this.remove(foundEmailVerification);
		const rawToken = Encryptor.generateRandomString();
		const newEmailVerification = new EmailVerificationEntity();
		newEmailVerification.verification_string = Encryptor.hashVerificationToken(rawToken);
		newEmailVerification.user = user;
		const entity = await this.save(newEmailVerification);
		return { entity, rawToken };
	},
};
