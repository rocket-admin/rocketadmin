import { BeforeInsert, Column, Entity, OneToMany, PrimaryColumn, Relation } from 'typeorm';
import { UserEntity } from '../user/user.entity.js';
import { ConnectionEntity } from '../connection/connection.entity.js';
import { InvitationInCompanyEntity } from './invitation-in-company/invitation-in-company.entity.js';
import { generateCompanyName } from './utils/get-company-name.js';

@Entity('company_info')
export class CompanyInfoEntity {
  @PrimaryColumn('uuid')
  id: string;

  @OneToMany(() => UserEntity, (user) => user.company, {
    onDelete: 'NO ACTION',
  })
  users: Relation<UserEntity>[];

  @Column({ type: 'varchar', length: 255, unique: false, nullable: true })
  name: string;

  @Column({ type: 'boolean', default: false })
  is2faEnabled: boolean;

  @BeforeInsert()
  getRandomName(): void {
    if (!this.name) {
      this.name = generateCompanyName();
    }
  }

  @OneToMany(() => ConnectionEntity, (connection) => connection.company, {
    onDelete: 'NO ACTION',
  })
  connections: Relation<ConnectionEntity>[];

  @OneToMany(() => InvitationInCompanyEntity, (invitation) => invitation.company, {
    onDelete: 'NO ACTION',
  })
  invitations: Relation<InvitationInCompanyEntity>[];
}
