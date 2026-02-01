import { UserAiChatEntity } from '../user-ai-chat.entity.js';

export interface IUserAiChatRepository {
	findAllChatsForUser(userId: string): Promise<UserAiChatEntity[]>;
	findChatByIdAndUserId(chatId: string, userId: string): Promise<UserAiChatEntity | null>;
	findChatWithMessagesByIdAndUserId(chatId: string, userId: string): Promise<UserAiChatEntity | null>;
	createChatForUser(userId: string, name?: string): Promise<UserAiChatEntity>;
	updateChatName(chatId: string, name: string): Promise<void>;
}
