import { IAiUserFilesRepository } from './ai-user-files-repository.interface.js';
import { AiUserFileEntity } from './ai-user-files.entity.js';

export const aiUserFileRepositoryExtension: IAiUserFilesRepository = {
  async findFileNyThreadId(threadId: string): Promise<AiUserFileEntity> {
    return await this.createQueryBuilder('ai_user_file')
      .leftJoin('ai_user_file.thread', 'thread')
      .where('thread.id = :threadId', { threadId })
      .getOne();
  },

  async findAllFilesByUserId(userId: string): Promise<Array<AiUserFileEntity>> {
    return await this.createQueryBuilder('ai_user_file')
      .leftJoin('ai_user_file.thread', 'thread')
      .leftJoin('thread.user', 'user')
      .where('user.id = :userId', { userId })
      .getMany();
  },
};
