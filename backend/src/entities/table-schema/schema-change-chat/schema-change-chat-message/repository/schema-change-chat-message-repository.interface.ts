import { MessageRole } from '../../../../ai/ai-conversation-history/ai-chat-messages/message-role.enum.js';
import { SchemaChangeChatMessageEntity } from '../schema-change-chat-message.entity.js';

export interface ISchemaChangeChatMessageRepository {
	findMessagesForChat(chatId: string): Promise<SchemaChangeChatMessageEntity[]>;
	deleteMessagesForChat(chatId: string): Promise<void>;
	saveMessage(
		chatId: string,
		message: string,
		role: MessageRole,
		batchId?: string | null,
	): Promise<SchemaChangeChatMessageEntity>;
}
