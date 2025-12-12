import { IAiResponsesToUserRepository } from './ai-responses-to-user-repository.interface.js';
import { AiResponsesToUserEntity } from './ai-responses-to-user.entity.js';

export const aiResponsesToUserRepositoryExtension: IAiResponsesToUserRepository = {
  async findResponseByIdAndUserId(responseId: string, userId: string): Promise<AiResponsesToUserEntity> {
    return await this.createQueryBuilder('ai_responses_to_user')
      .leftJoin('ai_responses_to_user.user', 'user')
      .where('user.id = :userId', { userId })
      .andWhere('ai_responses_to_user.id = :responseId', { responseId })
      .getOne();
  },
};
