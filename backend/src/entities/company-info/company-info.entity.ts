import { BeforeInsert, Column, Entity, OneToMany, OneToOne, PrimaryColumn, Relation } from 'typeorm';
import { UserEntity } from '../user/user.entity.js';
import { ConnectionEntity } from '../connection/connection.entity.js';
import { InvitationInCompanyEntity } from './invitation-in-company/invitation-in-company.entity.js';
import { generateCompanyName } from './utils/get-company-name.js';
import { CompanyLogoEntity } from '../company-logo/company-logo.entity.js';
import { CompanyFaviconEntity } from '../company-favicon/company-favicon.entity.js';
import { CompanyTabTitleEntity } from '../company-tab-title/company-tab-title.entity.js';

@Entity('company_info')
export class CompanyInfoEntity {
  @PrimaryColumn('uuid')
  id: string;

  @OneToMany((_) => UserEntity, (user) => user.company, {
    onDelete: 'NO ACTION',
  })
  users: Relation<UserEntity>[];

  @Column({ type: 'varchar', length: 255, unique: false, nullable: true })
  name: string;

  @Column({ type: 'boolean', default: false })
  is2faEnabled: boolean;

  @Column({ type: 'boolean', default: true })
  show_test_connections: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @BeforeInsert()
  getRandomName(): void {
    if (!this.name) {
      this.name = generateCompanyName();
    }
  }

  @OneToMany((_) => ConnectionEntity, (connection) => connection.company, {
    onDelete: 'NO ACTION',
  })
  connections: Relation<ConnectionEntity>[];

  @OneToMany((_) => InvitationInCompanyEntity, (invitation) => invitation.company, {
    onDelete: 'NO ACTION',
  })
  invitations: Relation<InvitationInCompanyEntity>[];

  @OneToOne((_) => CompanyLogoEntity, (logo) => logo.company, {
    onDelete: 'NO ACTION',
  })
  logo: Relation<CompanyLogoEntity>;

  @OneToOne((_) => CompanyFaviconEntity, (favicon) => favicon.company, {
    onDelete: 'NO ACTION',
  })
  favicon: Relation<CompanyFaviconEntity>;

  @OneToOne((_) => CompanyTabTitleEntity, (tab_title) => tab_title.company, {
    onDelete: 'NO ACTION',
  })
  tab_title: Relation<CompanyTabTitleEntity>;
}
