import { MessageRole } from '../../../../ai/ai-conversation-history/ai-chat-messages/message-role.enum.js';
import { SchemaChangeChatMessageEntity } from '../schema-change-chat-message.entity.js';
import { ISchemaChangeChatMessageRepository } from './schema-change-chat-message-repository.interface.js';

export const schemaChangeChatMessageRepositoryExtension: ISchemaChangeChatMessageRepository = {
	async findMessagesForChat(chatId: string): Promise<SchemaChangeChatMessageEntity[]> {
		return await this.createQueryBuilder('schema_change_chat_message')
			.where('schema_change_chat_message.chat_id = :chatId', { chatId })
			.orderBy('schema_change_chat_message.created_at', 'ASC')
			.getMany();
	},

	async deleteMessagesForChat(chatId: string): Promise<void> {
		await this.createQueryBuilder()
			.delete()
			.from('schema_change_chat_message')
			.where('chat_id = :chatId', { chatId })
			.execute();
	},

	async saveMessage(
		chatId: string,
		message: string,
		role: MessageRole,
		batchId?: string | null,
	): Promise<SchemaChangeChatMessageEntity> {
		const newMessage = this.create({
			chat_id: chatId,
			message,
			role,
			batch_id: batchId ?? null,
		});
		return await this.save(newMessage);
	},
};
