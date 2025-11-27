import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { UserEntity } from '../user/user.entity.js';
import { SignInStatusEnum } from './enums/sign-in-status.enum.js';
import { SignInMethodEnum } from './enums/sign-in-method.enum.js';

@Entity('signInAudit')
export class SignInAuditEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: null })
  email: string;

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

  @Column({ default: null })
  ipAddress: string;

  @Column({ default: null })
  userAgent: string;

  @Column({ default: null })
  failureReason: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @ManyToOne((_) => UserEntity, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'userId' })
  user: Relation<UserEntity>;

  @Column()
  userId: string;
}
