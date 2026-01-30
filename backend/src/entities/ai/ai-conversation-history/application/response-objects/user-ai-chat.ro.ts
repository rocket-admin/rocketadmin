import { MessageRole } from '../../ai-chat-messages/message-role.enum.js';

export class AiChatMessageRO {
	id: string;
	message: string;
	role: MessageRole;
	created_at: Date;
}

export class UserAiChatRO {
	id: string;
	name: string;
	created_at: Date;
	updated_at: Date;
}

export class UserAiChatWithMessagesRO extends UserAiChatRO {
	messages: AiChatMessageRO[];
}
