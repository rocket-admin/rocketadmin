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
import { ConnectionEntity } from '../../../connection/connection.entity.js';
import { UserEntity } from '../../../user/user.entity.js';
import { SchemaChangeChatMessageEntity } from '../schema-change-chat-message/schema-change-chat-message.entity.js';

@Entity('schema_change_chat')
export class SchemaChangeChatEntity {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ default: null })
	name: string;

	@CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
	created_at: Date;

	@UpdateDateColumn({ type: 'timestamp', nullable: true, default: null })
	updated_at: Date;

	@ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'user_id' })
	user: Relation<UserEntity>;

	@Column()
	user_id: string;

	@ManyToOne(() => ConnectionEntity, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'connection_id' })
	connection: Relation<ConnectionEntity>;

	@Column({ type: 'varchar', length: 38 })
	connection_id: string;

	@Column({ type: 'uuid', nullable: true, default: null })
	last_batch_id: string | null;

	@OneToMany(
		() => SchemaChangeChatMessageEntity,
		(message) => message.chat,
	)
	messages: Relation<SchemaChangeChatMessageEntity>[];
}
