import { AiChatMessageEntity } from '../../ai-chat-messages/ai-chat-message.entity.js';
import { UserAiChatEntity } from '../../user-ai-chat/user-ai-chat.entity.js';
import { AiChatMessageRO, UserAiChatRO, UserAiChatWithMessagesRO } from '../response-objects/user-ai-chat.ro.js';

export function buildUserAiChatRO(chat: UserAiChatEntity): UserAiChatRO {
	return {
		id: chat.id,
		name: chat.name,
		created_at: chat.created_at,
		updated_at: chat.updated_at,
	};
}

export function buildAiChatMessageRO(message: AiChatMessageEntity): AiChatMessageRO {
	return {
		id: message.id,
		message: message.message,
		role: message.role,
		created_at: message.created_at,
	};
}

export function buildUserAiChatWithMessagesRO(chat: UserAiChatEntity): UserAiChatWithMessagesRO {
	return {
		id: chat.id,
		name: chat.name,
		created_at: chat.created_at,
		updated_at: chat.updated_at,
		messages: chat.messages?.map((message) => buildAiChatMessageRO(message)) ?? [],
	};
}
