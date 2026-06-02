import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { UserEntity } from '../user.entity.js';

@Entity('password_reset')
export class PasswordResetEntity {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ default: null })
	verification_string: string;

	@Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
	createdAt: Date;

	@OneToOne(
		() => UserEntity,
		(user) => user.password_reset,
		{ onDelete: 'CASCADE' },
	)
	@JoinColumn()
	user: Relation<UserEntity>;
}
