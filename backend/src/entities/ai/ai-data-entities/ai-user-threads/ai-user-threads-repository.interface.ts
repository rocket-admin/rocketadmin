import { AiUserThreadEntity } from './ai-user-threads.entity.js';

export interface IAiUserThreadsRepository {
  findThreadsByUserId(userId: string): Promise<Array<AiUserThreadEntity>>;

  findThreadByIdAndUserId(threadId: string, userId: string): Promise<AiUserThreadEntity>;

  findThreadByIdAndUserIdWithFile(threadId: string, userId: string): Promise<AiUserThreadEntity>;
}
