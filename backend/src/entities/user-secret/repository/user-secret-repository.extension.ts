import { DeepPartial, FindOptionsWhere, Like } from 'typeorm';
import { UserSecretEntity } from '../user-secret.entity.js';
import { IUserSecretRepository } from './user-secret-repository.interface.js';

export const userSecretRepositoryExtension: IUserSecretRepository = {
	/**
	 * Atomically provisions a secret the first time it is needed and returns whichever row exists
	 * afterwards — the one just inserted or the one a concurrent caller inserted first.
	 * `user_secrets (companyId, slug)` is UNIQUE; a read-then-insert races with itself when several
	 * requests provision the same slug at once (e.g. the universal-backend instances all fetching a
	 * fresh site's end-user signing key on its first page load) and the losers fail with
	 * `duplicate key value violates unique constraint "IDX_f39a47aac503fe096b0c77f2b3"`.
	 * `INSERT … ON CONFLICT DO NOTHING` + re-read makes every caller land on the single row.
	 */
	async createSecretUnlessExists(
		values: DeepPartial<UserSecretEntity> & { slug: string; companyId: string },
	): Promise<UserSecretEntity> {
		await this.createQueryBuilder().insert().into(UserSecretEntity).values(values).orIgnore().execute();
		const secret = await this.findOne({ where: { slug: values.slug, companyId: values.companyId } });
		if (!secret) {
			throw new Error(`Secret "${values.slug}" is missing right after its creation.`);
		}
		return secret;
	},

	async findSecretBySlugAndCompanyId(slug: string, companyId: string): Promise<UserSecretEntity | null> {
		return this.findOne({
			where: {
				slug,
				companyId,
			},
		});
	},

	async findSecretsForCompany(
		companyId: string,
		options: { page: number; limit: number; search?: string },
	): Promise<[UserSecretEntity[], number]> {
		const where: FindOptionsWhere<UserSecretEntity> = {
			companyId,
		};

		if (options.search) {
			where.slug = Like(`%${options.search}%`);
		}

		return this.findAndCount({
			where,
			order: {
				createdAt: 'DESC',
			},
			skip: (options.page - 1) * options.limit,
			take: options.limit,
		});
	},
};
