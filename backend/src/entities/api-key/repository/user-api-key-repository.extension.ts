import { UserApiKeyEntity } from '../api-key.entity.js';
import { IUserApiKeyRepository } from './user-api-key-repository.interface.js';

export const userApiRepositoryExtension: IUserApiKeyRepository = {
  async findApiKeysByUserId(userId: string): Promise<Array<UserApiKeyEntity>> {
    return await this.createQueryBuilder('user_api_key')
      .leftJoinAndSelect('user_api_key.user', 'user')
      .where('user.id = :userId', { userId })
      .getMany();
  },
};
