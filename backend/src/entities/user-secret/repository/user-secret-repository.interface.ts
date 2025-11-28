import { UserSecretEntity } from '../user-secret.entity.js';

export interface IUserSecretRepository {
  findSecretBySlugAndCompanyId(slug: string, companyId: string): Promise<UserSecretEntity | null>;
  findSecretsForCompany(
    companyId: string,
    options: { page: number; limit: number; search?: string },
  ): Promise<[UserSecretEntity[], number]>;
}
