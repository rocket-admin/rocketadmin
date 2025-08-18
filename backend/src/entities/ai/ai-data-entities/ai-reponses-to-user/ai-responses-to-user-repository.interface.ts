import { AiResponsesToUserEntity } from './ai-responses-to-user.entity.js';

export interface IAiResponsesToUserRepository {
  findResponsesByUserId(userId: string): Promise<Array<AiResponsesToUserEntity>>;

  findResponseByIdAndUserId(responseId: string, userId: string): Promise<AiResponsesToUserEntity>;
}
