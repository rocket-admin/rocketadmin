import { IAiChatMessageRepository } from './ai-chat-message-repository.interface.js';
import { AiChatMessageEntity } from '../ai-chat-message.entity.js';

export const aiChatMessageRepositoryExtension: IAiChatMessageRepository = {
	async findMessagesForChat(chatId: string): Promise<AiChatMessageEntity[]> {
		return await this.createQueryBuilder('ai_chat_message')
			.where('ai_chat_message.ai_chat_id = :chatId', { chatId })
			.orderBy('ai_chat_message.created_at', 'ASC')
			.getMany();
	},

	async deleteMessagesForChat(chatId: string): Promise<void> {
		await this.createQueryBuilder()
			.delete()
			.from('ai_chat_message')
			.where('ai_chat_id = :chatId', { chatId })
			.execute();
	},
};
