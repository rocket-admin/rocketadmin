import { AiChatMessageEntity } from '../ai-chat-message.entity.js';
import { MessageRole } from '../message-role.enum.js';

export interface IAiChatMessageRepository {
	findMessagesForChat(chatId: string): Promise<AiChatMessageEntity[]>;
	deleteMessagesForChat(chatId: string): Promise<void>;
	saveMessage(chatId: string, message: string, role: MessageRole): Promise<AiChatMessageEntity>;
}
