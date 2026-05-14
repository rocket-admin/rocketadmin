import { SchemaChangeChatEntity } from '../schema-change-chat.entity.js';
import { ISchemaChangeChatRepository } from './schema-change-chat-repository.interface.js';

export const schemaChangeChatRepositoryExtension: ISchemaChangeChatRepository = {
	async findChatByIdAndUserId(chatId: string, userId: string): Promise<SchemaChangeChatEntity | null> {
		return await this.createQueryBuilder('schema_change_chat')
			.where('schema_change_chat.id = :chatId', { chatId })
			.andWhere('schema_change_chat.user_id = :userId', { userId })
			.getOne();
	},

	async findChatWithMessagesByIdAndUserId(chatId: string, userId: string): Promise<SchemaChangeChatEntity | null> {
		return await this.createQueryBuilder('schema_change_chat')
			.leftJoinAndSelect('schema_change_chat.messages', 'messages')
			.where('schema_change_chat.id = :chatId', { chatId })
			.andWhere('schema_change_chat.user_id = :userId', { userId })
			.orderBy('messages.created_at', 'ASC')
			.getOne();
	},

	async findChatsForConnection(connectionId: string, userId: string): Promise<SchemaChangeChatEntity[]> {
		return await this.createQueryBuilder('schema_change_chat')
			.where('schema_change_chat.connection_id = :connectionId', { connectionId })
			.andWhere('schema_change_chat.user_id = :userId', { userId })
			.orderBy('schema_change_chat.created_at', 'DESC')
			.getMany();
	},

	async createChatForUser(userId: string, connectionId: string, name?: string): Promise<SchemaChangeChatEntity> {
		const newChat = this.create({
			user_id: userId,
			connection_id: connectionId,
			name: name || null,
		});
		return await this.save(newChat);
	},

	async updateChatName(chatId: string, name: string): Promise<void> {
		await this.createQueryBuilder()
			.update(SchemaChangeChatEntity)
			.set({ name })
			.where('id = :chatId', { chatId })
			.execute();
	},

	async updateLastBatchId(chatId: string, batchId: string): Promise<void> {
		await this.createQueryBuilder()
			.update(SchemaChangeChatEntity)
			.set({ last_batch_id: batchId })
			.where('id = :chatId', { chatId })
			.execute();
	},
};
