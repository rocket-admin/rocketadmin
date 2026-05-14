import { SchemaChangeChatEntity } from '../schema-change-chat.entity.js';

export interface ISchemaChangeChatRepository {
	findChatByIdAndUserId(chatId: string, userId: string): Promise<SchemaChangeChatEntity | null>;
	findChatWithMessagesByIdAndUserId(chatId: string, userId: string): Promise<SchemaChangeChatEntity | null>;
	findChatsForConnection(connectionId: string, userId: string): Promise<SchemaChangeChatEntity[]>;
	createChatForUser(userId: string, connectionId: string, name?: string): Promise<SchemaChangeChatEntity>;
	updateChatName(chatId: string, name: string): Promise<void>;
	updateLastBatchId(chatId: string, batchId: string): Promise<void>;
}
