import { Like } from 'typeorm';
import { UserSecretEntity } from '../user-secret.entity.js';
import { IUserSecretRepository } from './user-secret-repository.interface.js';

export const userSecretRepositoryExtension: IUserSecretRepository = {
  async findSecretBySlugAndCompanyId(slug: string, companyId: string): Promise<UserSecretEntity | null> {
    const self = this as any;
    return self.findOne({
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
    const self = this as any;
    const where: any = {
      companyId,
    };

    if (options.search) {
      where.slug = Like(`%${options.search}%`);
    }

    return self.findAndCount({
      where,
      order: {
        createdAt: 'DESC',
      },
      skip: (options.page - 1) * options.limit,
      take: options.limit,
    });
  },
};
