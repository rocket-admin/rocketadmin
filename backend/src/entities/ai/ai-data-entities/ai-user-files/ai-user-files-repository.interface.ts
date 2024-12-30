import { AiUserFileEntity } from './ai-user-files.entity.js';

export interface IAiUserFilesRepository {
  findFileNyThreadId(threadId: string): Promise<AiUserFileEntity>;

  findAllFilesByUserId(userId: string): Promise<Array<AiUserFileEntity>>;
}
