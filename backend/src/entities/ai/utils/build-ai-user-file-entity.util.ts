import { AiUserFileEntity } from '../ai-data-entities/ai-user-files/ai-user-files.entity.js';

export function buildUserAiFileEntity(file_ai_id: string): AiUserFileEntity {
  const userAiFile = new AiUserFileEntity();
  userAiFile.file_ai_id = file_ai_id;
  return userAiFile;
}
