import { IUserAiChatRepository } from './user-ai-chat-repository.interface.js';
import { UserAiChatEntity } from '../user-ai-chat.entity.js';

export const userAiChatRepositoryExtension: IUserAiChatRepository = {
	async findAllChatsForUser(userId: string): Promise<UserAiChatEntity[]> {
		return await this.createQueryBuilder('user_ai_chat')
			.where('user_ai_chat.user_id = :userId', { userId })
			.orderBy('user_ai_chat.created_at', 'DESC')
			.getMany();
	},

	async findChatByIdAndUserId(chatId: string, userId: string): Promise<UserAiChatEntity | null> {
		return await this.createQueryBuilder('user_ai_chat')
			.where('user_ai_chat.id = :chatId', { chatId })
			.andWhere('user_ai_chat.user_id = :userId', { userId })
			.getOne();
	},

	async findChatWithMessagesByIdAndUserId(chatId: string, userId: string): Promise<UserAiChatEntity | null> {
		return await this.createQueryBuilder('user_ai_chat')
			.leftJoinAndSelect('user_ai_chat.messages', 'messages')
			.where('user_ai_chat.id = :chatId', { chatId })
			.andWhere('user_ai_chat.user_id = :userId', { userId })
			.orderBy('messages.created_at', 'ASC')
			.getOne();
	},

	async createChatForUser(userId: string, name?: string): Promise<UserAiChatEntity> {
		const newChat = this.create({
			user_id: userId,
			name: name || null,
		});
		return await this.save(newChat);
	},

	async updateChatName(chatId: string, name: string): Promise<void> {
		await this.createQueryBuilder().update(UserAiChatEntity).set({ name }).where('id = :chatId', { chatId }).execute();
	},
};
