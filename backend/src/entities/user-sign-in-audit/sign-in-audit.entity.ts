import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { UserEntity } from '../user/user.entity.js';
import { SignInMethodEnum } from './enums/sign-in-method.enum.js';
import { SignInStatusEnum } from './enums/sign-in-status.enum.js';

@Entity('signInAudit')
export class SignInAuditEntity {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ type: 'varchar', default: null })
	email: string | null;

	@Column('enum', {
		nullable: false,
		enum: SignInStatusEnum,
		default: SignInStatusEnum.SUCCESS,
	})
	status: SignInStatusEnum;

	@Column('enum', {
		nullable: false,
		enum: SignInMethodEnum,
		default: SignInMethodEnum.EMAIL,
	})
	signInMethod: SignInMethodEnum;

	@Column({ type: 'varchar', default: null })
	ipAddress: string | null;

	@Column({ type: 'varchar', default: null })
	userAgent: string | null;

	@Column({ type: 'varchar', default: null })
	failureReason: string | null;

	@Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
	createdAt: Date;

	@ManyToOne((_) => UserEntity, { onDelete: 'CASCADE', nullable: true })
	@JoinColumn({ name: 'userId' })
	user: Relation<UserEntity>;

	@Column({ type: 'uuid', nullable: true })
	userId: string | null;
}
