import { UserApiKeyEntity } from '../api-key.entity.js';
import { IUserApiKeyRepository } from './user-api-key-repository.interface.js';

export const userApiRepositoryExtension: IUserApiKeyRepository = {
  async findApiKeysByUserId(userId: string): Promise<Array<UserApiKeyEntity>> {
    return await this.createQueryBuilder('user_api_key')
      .leftJoinAndSelect('user_api_key.user', 'user')
      .where('user.id = :userId', { userId })
      .getMany();
  },

  async findApiKeyByIdAndUserId(apiKeyId: string, userId: string): Promise<UserApiKeyEntity> {
    return await this.createQueryBuilder('user_api_key')
      .leftJoinAndSelect('user_api_key.user', 'user')
      .where('user.id = :userId', { userId })
      .andWhere('user_api_key.id = :apiKeyId', { apiKeyId })
      .getOne();
  },
};
