import { DeepPartial, Repository } from 'typeorm';
import { UserSecretEntity } from '../user-secret.entity.js';

export interface IUserSecretRepository {
	createSecretUnlessExists(
		this: Repository<UserSecretEntity>,
		values: DeepPartial<UserSecretEntity> & { slug: string; companyId: string },
	): Promise<UserSecretEntity>;
	findSecretBySlugAndCompanyId(
		this: Repository<UserSecretEntity>,
		slug: string,
		companyId: string,
	): Promise<UserSecretEntity | null>;
	findSecretsForCompany(
		this: Repository<UserSecretEntity>,
		companyId: string,
		options: { page: number; limit: number; search?: string },
	): Promise<[UserSecretEntity[], number]>;
}
