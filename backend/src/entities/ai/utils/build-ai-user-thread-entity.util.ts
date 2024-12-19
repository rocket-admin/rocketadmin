import { AiUserThreadEntity } from '../ai-data-entities/ai-user-threads/ai-user-threads.entity.js';

export function buildUserAiThreadEntity(thread_ai_id: string): AiUserThreadEntity {
  const userAiThread = new AiUserThreadEntity();
  userAiThread.thread_ai_id = thread_ai_id;
  return userAiThread;
}
