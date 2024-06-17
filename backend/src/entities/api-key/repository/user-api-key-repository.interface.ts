import { UserApiKeyEntity } from '../api-key.entity.js';

export interface IUserApiKeyRepository {
  findApiKeysByUserId(userId: string): Promise<Array<UserApiKeyEntity>>;
}
