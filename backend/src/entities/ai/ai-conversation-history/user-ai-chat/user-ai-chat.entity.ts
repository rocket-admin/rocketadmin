import {
	Column,
	CreateDateColumn,
	Entity,
	JoinColumn,
	ManyToOne,
	OneToMany,
	PrimaryGeneratedColumn,
	Relation,
	UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '../../../user/user.entity.js';
import { AiChatMessageEntity } from '../ai-chat-messages/ai-chat-message.entity.js';

@Entity('user_ai_chat')
export class UserAiChatEntity {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ default: null })
	name: string;

	@CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
	created_at: Date;

	@UpdateDateColumn({ type: 'timestamp', nullable: true, default: null })
	updated_at: Date;

	@ManyToOne(
		() => UserEntity,
		(user) => user.ai_chats,
	)
	@JoinColumn({ name: 'user_id' })
	user: Relation<UserEntity>;

	@OneToMany(
		() => AiChatMessageEntity,
		(message) => message.ai_chat,
	)
	messages: Relation<AiChatMessageEntity>[];

	@Column()
	user_id: string;
}
