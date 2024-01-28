import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { CompanyInfoEntity } from '../company-info.entity.js';
import { UserRoleEnum } from '../../user/enums/user-role.enum.js';

@Entity('invitation_in_company')
export class InvitationInCompanyEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: null })
  verification_string: string | null;

  @Column({ default: null })
  groupId: string | null;

  @Column({ default: null })
  inviterId: string | null;

  @Column({ default: null })
  invitedUserEmail: string | null;

  @Column('enum', {
    nullable: false,
    enum: UserRoleEnum,
    default: UserRoleEnum.USER,
  })
  role: UserRoleEnum;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @ManyToOne(() => CompanyInfoEntity, (companyInfo) => companyInfo.invitations, { onDelete: 'CASCADE' })
  @JoinColumn()
  company: Relation<CompanyInfoEntity>;
}
