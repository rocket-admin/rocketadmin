import { ApiProperty } from '@nestjs/swagger';
import { MessageRole } from '../../ai-chat-messages/message-role.enum.js';

export class AiChatMessageRO {
	@ApiProperty({ description: 'Unique message identifier' })
	id: string;

	@ApiProperty({ description: 'Message content' })
	message: string;

	@ApiProperty({ enum: MessageRole, description: 'Role of the message sender (user or ai)' })
	role: MessageRole;

	@ApiProperty({ description: 'Message creation timestamp' })
	created_at: Date;
}

export class UserAiChatRO {
	@ApiProperty({ description: 'Unique chat identifier' })
	id: string;

	@ApiProperty({ description: 'Chat name' })
	name: string;

	@ApiProperty({ description: 'Chat creation timestamp' })
	created_at: Date;

	@ApiProperty({ description: 'Chat last update timestamp' })
	updated_at: Date;
}

export class UserAiChatWithMessagesRO extends UserAiChatRO {
	@ApiProperty({ type: [AiChatMessageRO], description: 'List of messages in the chat' })
	messages: AiChatMessageRO[];
}
