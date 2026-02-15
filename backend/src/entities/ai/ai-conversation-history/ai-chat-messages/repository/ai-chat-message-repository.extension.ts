import { AiChatMessageEntity } from '../ai-chat-message.entity.js';
import { MessageRole } from '../message-role.enum.js';
import { IAiChatMessageRepository } from './ai-chat-message-repository.interface.js';

export const aiChatMessageRepositoryExtension: IAiChatMessageRepository = {
	async findMessagesForChat(chatId: string): Promise<AiChatMessageEntity[]> {
		return await this.createQueryBuilder('ai_chat_message')
			.where('ai_chat_message.ai_chat_id = :chatId', { chatId })
			.orderBy('ai_chat_message.created_at', 'ASC')
			.getMany();
	},

	async findLastAiMessageForChat(chatId: string): Promise<AiChatMessageEntity | null> {
		return await this.createQueryBuilder('ai_chat_message')
			.where('ai_chat_message.ai_chat_id = :chatId', { chatId })
			.andWhere('ai_chat_message.role = :role', { role: MessageRole.ai })
			.orderBy('ai_chat_message.created_at', 'DESC')
			.getOne();
	},

	async deleteMessagesForChat(chatId: string): Promise<void> {
		await this.createQueryBuilder()
			.delete()
			.from('ai_chat_message')
			.where('ai_chat_id = :chatId', { chatId })
			.execute();
	},

	async saveMessage(
		chatId: string,
		message: string,
		role: MessageRole,
		responseId?: string,
	): Promise<AiChatMessageEntity> {
		const newMessage = this.create({
			ai_chat_id: chatId,
			message,
			role,
			response_id: responseId,
		});
		return await this.save(newMessage);
	},
};
