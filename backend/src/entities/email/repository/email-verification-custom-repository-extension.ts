import { Constants } from '../../../helpers/constants/constants.js';
import { Encryptor } from '../../../helpers/encryption/encryptor.js';
import { UserEntity } from '../../user/user.entity.js';
import { EmailVerificationEntity } from '../email-verification.entity.js';

export const emailVerificationRepositoryExtension = {
	async findVerificationWithVerificationString(verificationString: string): Promise<EmailVerificationEntity> {
		const qb = this.createQueryBuilder('email_verification')
			.leftJoinAndSelect('email_verification.user', 'user')
			.where('email_verification.verification_string = :ver_string', {
				ver_string: verificationString,
			})
			.andWhere('email_verification.createdAt >= :valid_after', {
				valid_after: Constants.ONE_DAY_AGO(),
			});
		return await qb.getOne();
	},

	async removeVerificationEntity(verification: EmailVerificationEntity): Promise<EmailVerificationEntity> {
		return await this.remove(verification);
	},

	async createOrUpdateEmailVerification(
		user: UserEntity,
	): Promise<{ entity: EmailVerificationEntity; rawToken: string }> {
		// A missing `user.email_verification` may only mean the caller loaded the
		// user without that relation (the invite flow does) — always query by
		// user id, or the insert below collides with the one-row-per-user unique
		// constraint for any registered-but-unconfirmed user.
		const foundEmailVerification = await this.findOne({ where: { user: { id: user.id } } });
		if (foundEmailVerification) {
			await this.remove(foundEmailVerification);
		}
		const rawToken = Encryptor.generateRandomString();
		const newEmailVerification = new EmailVerificationEntity();
		newEmailVerification.verification_string = Encryptor.hashVerificationToken(rawToken);
		newEmailVerification.user = user;
		const entity = await this.save(newEmailVerification);
		return { entity, rawToken };
	},
};
