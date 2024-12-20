import { AiUserThreadEntity } from '../ai-data-entities/ai-user-threads/ai-user-threads.entity.js';
import { FoundUserThreadsWithAiRO } from '../application/dto/found-user-threads-with-ai.ro.js';

export function buildFoundUserThreadWithAiRO(thread: AiUserThreadEntity): FoundUserThreadsWithAiRO {
  return {
    id: thread.id,
    createdAt: thread.createdAt,
    title: thread.title,
  }
}
