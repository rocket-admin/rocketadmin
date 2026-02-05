import { Encryptor } from '../../../../helpers/encryption/encryptor.js';
import { UserEntity } from '../../user.entity.js';
import { EmailChangeEntity } from '../email-change.entity.js';

export const emailChangeCustomRepositoryExtension = {
	async findEmailChangeWithVerificationString(verificationString: string): Promise<EmailChangeEntity> {
		const qb = this.createQueryBuilder('email_change')
			.leftJoinAndSelect('email_change.user', 'user')
			.where('email_change.verification_string = :ver_string', { ver_string: verificationString });
		return await qb.getOne();
	},

	async removeEmailChangeEntity(emailChangeEntity: EmailChangeEntity): Promise<EmailChangeEntity> {
		return await this.remove(emailChangeEntity);
	},

	async saveEmailChangeEntity(emailChangeEntity: EmailChangeEntity): Promise<EmailChangeEntity> {
		return await this.save(emailChangeEntity);
	},

	async createOrUpdateEmailChangeEntity(user: UserEntity): Promise<{ entity: EmailChangeEntity; rawToken: string }> {
		const qb = this.createQueryBuilder('email_change')
			.leftJoinAndSelect('email_change.user', 'user')
			.where('user.id = :userId', { userId: user.id });
		const foundChange = await qb.getOne();
		if (foundChange) {
			await this.remove(foundChange);
		}
		const rawToken = Encryptor.generateRandomString();
		const newEmailChangeRequest = new EmailChangeEntity();
		newEmailChangeRequest.verification_string = Encryptor.hashVerificationToken(rawToken);
		newEmailChangeRequest.user = user;
		const entity = await this.save(newEmailChangeRequest);
		return { entity, rawToken };
	},
};
