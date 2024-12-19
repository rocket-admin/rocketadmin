import { IAiUserThreadsRepository } from './ai-user-threads-repository.interface.js';
import { AiUserThreadEntity } from './ai-user-threads.entity.js';

export const aiUserThreadRepositoryExtension: IAiUserThreadsRepository = {
  async findThreadsByUserId(userId: string): Promise<Array<AiUserThreadEntity>> {
    return await this.createQueryBuilder('ai_user_thread')
      .leftJoin('ai_user_thread.user', 'user')
      .where('user.id = :userId', { userId })
      .getMany();
  },

  async findThreadByIdAndUserIdWithFile(threadId: string, userId: string): Promise<AiUserThreadEntity> {
    return await this.createQueryBuilder('ai_user_thread')
      .leftJoin('ai_user_thread.user', 'user')
      .leftJoinAndSelect('ai_user_thread.thread_file', 'thread_file')
      .where('user.id = :userId', { userId })
      .andWhere('ai_user_thread.id = :threadId', { threadId })
      .getOne();
  },
};
