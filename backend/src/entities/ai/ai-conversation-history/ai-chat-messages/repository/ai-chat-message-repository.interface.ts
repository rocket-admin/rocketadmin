import { AiChatMessageEntity } from '../ai-chat-message.entity.js';

export interface IAiChatMessageRepository {
	findMessagesForChat(chatId: string): Promise<AiChatMessageEntity[]>;
	deleteMessagesForChat(chatId: string): Promise<void>;
}
