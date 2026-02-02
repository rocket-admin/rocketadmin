import { AiChatMessageEntity } from '../ai-chat-message.entity.js';
import { MessageRole } from '../message-role.enum.js';

export interface IAiChatMessageRepository {
	findMessagesForChat(chatId: string): Promise<AiChatMessageEntity[]>;
	findLastAiMessageForChat(chatId: string): Promise<AiChatMessageEntity | null>;
	deleteMessagesForChat(chatId: string): Promise<void>;
	saveMessage(chatId: string, message: string, role: MessageRole, responseId?: string): Promise<AiChatMessageEntity>;
}
