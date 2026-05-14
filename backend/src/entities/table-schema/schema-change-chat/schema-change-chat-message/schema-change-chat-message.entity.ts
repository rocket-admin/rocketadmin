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
import { MessageRole } from '../../../ai/ai-conversation-history/ai-chat-messages/message-role.enum.js';
import { SchemaChangeChatEntity } from '../schema-change-chat/schema-change-chat.entity.js';

@Entity('schema_change_chat_message')
export class SchemaChangeChatMessageEntity {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ default: null, type: 'text' })
	message: string;

	@Column({ nullable: true, default: null, type: 'enum', enum: MessageRole })
	role: MessageRole;

	@Column({ type: 'uuid', nullable: true, default: null })
	batch_id: string | null;

	@CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
	created_at: Date;

	@UpdateDateColumn({ type: 'timestamp', nullable: true, default: null })
	updated_at: Date;

	@ManyToOne(
		() => SchemaChangeChatEntity,
		(chat) => chat.messages,
		{ onDelete: 'CASCADE' },
	)
	@JoinColumn({ name: 'chat_id' })
	chat: Relation<SchemaChangeChatEntity>;

	@Column()
	chat_id: string;
}
