import { ConnectionEntity } from '../connection/connection.entity.js';
import {
  Entity,
  Column,
  JoinTable,
  ManyToMany,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  BeforeInsert,
} from 'typeorm';
import { GroupEntity } from '../group/group.entity.js';
import { UserActionEntity } from '../user-actions/user-action.entity.js';
import { IsEmail } from 'class-validator';
import { Encryptor } from '../../helpers/encryption/encryptor.js';
import { EmailVerificationEntity } from '../email/email-verification.entity.js';
import { PasswordResetEntity } from './user-password/password-reset.entity.js';
import { EmailChangeEntity } from './user-email/email-change.entity.js';
import { UserInvitationEntity } from './user-invitation/user-invitation.entity.js';

@Entity('user')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: null })
  @IsEmail()
  email: string;

  @Column({ default: null })
  password: string;

  @Column({ default: null })
  name: string;

  @BeforeInsert()
  async hashPassword() {
    if (this.password) {
      this.password = await Encryptor.hashUserPassword(this.password);
    }
  }

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ default: null })
  gclid: string;

  @OneToMany(() => ConnectionEntity, (connection) => connection.author)
  @JoinTable()
  connections: ConnectionEntity[];

  @ManyToMany((type) => GroupEntity, (group) => group.users)
  @JoinTable()
  groups: GroupEntity[];

  @OneToOne(() => UserActionEntity, (user_action) => user_action.user)
  user_action: UserActionEntity;

  @OneToOne(() => EmailVerificationEntity, (email_verification) => email_verification.user)
  email_verification: EmailVerificationEntity;

  @OneToOne(() => PasswordResetEntity, (password_reset) => password_reset.user)
  password_reset: PasswordResetEntity;

  @OneToOne(() => EmailChangeEntity, (email_change) => email_change.user)
  email_change: EmailChangeEntity;

  @OneToOne(() => UserInvitationEntity, (user_invitation) => user_invitation.user)
  user_invitation: UserInvitationEntity;

  @Column({ default: false })
  isActive: boolean;

  @Column({ default: null })
  stripeId: string;
}
