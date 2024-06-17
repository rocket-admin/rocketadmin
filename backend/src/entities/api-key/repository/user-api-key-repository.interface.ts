import { UserApiKeyEntity } from '../api-key.entity.js';

export interface IUserApiKeyRepository {
  findApiKeysByUserId(userId: string): Promise<Array<UserApiKeyEntity>>;

  findApiKeyByIdAndUserId(apiKeyId: string, userId: string): Promise<UserApiKeyEntity>;
}
