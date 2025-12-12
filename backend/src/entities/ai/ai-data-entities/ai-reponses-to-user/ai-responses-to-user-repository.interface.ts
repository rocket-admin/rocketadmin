import { AiResponsesToUserEntity } from './ai-responses-to-user.entity.js';

export interface IAiResponsesToUserRepository {
  findResponseByIdAndUserId(responseId: string, userId: string): Promise<AiResponsesToUserEntity>;
}
