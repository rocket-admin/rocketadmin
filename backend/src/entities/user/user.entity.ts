 
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
  Relation,
  BeforeUpdate,
  AfterLoad,
  ManyToOne,
} from 'typeorm';
import { GroupEntity } from '../group/group.entity.js';
import { UserActionEntity } from '../user-actions/user-action.entity.js';
import { Encryptor } from '../../helpers/encryption/encryptor.js';
import { EmailVerificationEntity } from '../email/email-verification.entity.js';
import { PasswordResetEntity } from './user-password/password-reset.entity.js';
import { EmailChangeEntity } from './user-email/email-change.entity.js';
import { UserInvitationEntity } from './user-invitation/user-invitation.entity.js';
import { GitHubUserIdentifierEntity } from './user-github-identifier/github-user-identifier.entity.js';
import { CompanyInfoEntity } from '../company-info/company-info.entity.js';
import { UserRoleEnum } from './enums/user-role.enum.js';
import { ExternalRegistrationProviderEnum } from './enums/external-registration-provider.enum.js';
import { UserApiKeyEntity } from '../api-key/api-key.entity.js';

@Entity('user')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: null })
  email: string;

  @Column({ default: null })
  password: string;

  @Column({ default: null })
  name: string;

  @Column({ default: false })
  suspended: boolean;

  @BeforeInsert()
  async hashPassword() {
    if (this.password) {
      this.password = await Encryptor.hashUserPassword(this.password);
    }
  }

  @BeforeUpdate()
  encryptOtpSecretKey() {
    if (this.isOTPEnabled && this.otpSecretKey) {
      this.otpSecretKey = Encryptor.encryptData(this.otpSecretKey);
    }
  }

  @AfterLoad()
  decryptOtpSecretKey() {
    if (this.isOTPEnabled && this.otpSecretKey) {
      this.otpSecretKey = Encryptor.decryptData(this.otpSecretKey);
    }
  }

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ default: null })
  gclid: string;

  @Column({ default: false })
  isOTPEnabled: boolean;

  @Column({ default: null })
  otpSecretKey: string;

  @OneToMany((_) => ConnectionEntity, (connection) => connection.author)
  @JoinTable()
  connections: Relation<ConnectionEntity>[];

  @ManyToOne((_) => CompanyInfoEntity, (company) => company.users, { onDelete: 'SET NULL' })
  @JoinTable()
  company: Relation<CompanyInfoEntity>;

  @ManyToMany((_) => GroupEntity, (group) => group.users)
  @JoinTable()
  groups: Relation<GroupEntity>[];

  @OneToOne((_) => UserActionEntity, (user_action) => user_action.user)
  user_action: Relation<UserActionEntity>;

  @OneToOne((_) => EmailVerificationEntity, (email_verification) => email_verification.user)
  email_verification: Relation<EmailVerificationEntity>;

  @OneToOne((_) => PasswordResetEntity, (password_reset) => password_reset.user)
  password_reset: Relation<PasswordResetEntity>;

  @OneToOne((_) => EmailChangeEntity, (email_change) => email_change.user)
  email_change: Relation<EmailChangeEntity>;

  @OneToOne((_) => UserInvitationEntity, (user_invitation) => user_invitation.user)
  user_invitation: Relation<UserInvitationEntity>;

  @OneToOne((_) => GitHubUserIdentifierEntity, (github_user_identifier) => github_user_identifier.user)
  github_user_identifier: Relation<GitHubUserIdentifierEntity>;

  @OneToMany((_) => UserApiKeyEntity, (api_key) => api_key.user)
  api_keys: Relation<UserApiKeyEntity>[];

  @Column({ default: false })
  isActive: boolean;

  @Column('enum', {
    nullable: false,
    enum: UserRoleEnum,
    default: UserRoleEnum.USER,
  })
  role: UserRoleEnum;

  @Column('enum', {
    nullable: true,
    enum: ExternalRegistrationProviderEnum,
    default: null,
  })
  externalRegistrationProvider: ExternalRegistrationProviderEnum;

  @Column({ default: true })
  showTestConnections: boolean;
}
