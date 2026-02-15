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
import { UserAiChatEntity } from '../user-ai-chat/user-ai-chat.entity.js';
import { MessageRole } from './message-role.enum.js';

@Entity('ai_chat_message')
export class AiChatMessageEntity {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ default: null, type: 'text' })
	message: string;

	@Column({ nullable: true, default: null, type: 'enum', enum: MessageRole })
	role: MessageRole;

	@Column({ nullable: true, default: null, type: 'varchar', length: 255 })
	response_id: string;

	@CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
	created_at: Date;

	@UpdateDateColumn({ type: 'timestamp', nullable: true, default: null })
	updated_at: Date;

	@ManyToOne(
		() => UserAiChatEntity,
		(ai_chat) => ai_chat.messages,
		{ onDelete: 'CASCADE' },
	)
	@JoinColumn({ name: 'ai_chat_id' })
	ai_chat: Relation<UserAiChatEntity>;

	@Column()
	ai_chat_id: string;
}
