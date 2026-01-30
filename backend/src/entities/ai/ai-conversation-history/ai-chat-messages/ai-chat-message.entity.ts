import {
	Column,
	CreateDateColumn,
	Entity,
	JoinColumn,
	ManyToOne,
	PrimaryGeneratedColumn,
	Relation,
	UpdateDateColumn,
} from 'typeorm';
import { MessageRole } from './message-role.enum.js';
import { UserAiChatEntity } from '../user-ai-chat/user-ai-chat.entity.js';

@Entity('ai_chat_message')
export class AiChatMessageEntity {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ default: null, type: 'text' })
	message: string;

	@Column({ nullable: true, default: null, type: 'enum', enum: MessageRole })
	role: MessageRole;

	@CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
	created_at: Date;

	@UpdateDateColumn({ type: 'timestamp', nullable: true, default: null })
	updated_at: Date;

	@ManyToOne(
		() => UserAiChatEntity,
		(ai_chat) => ai_chat.messages,
	)
	@JoinColumn({ name: 'ai_chat_id' })
	ai_chat: Relation<UserAiChatEntity>;

	@Column()
	ai_chat_id: string;
}
