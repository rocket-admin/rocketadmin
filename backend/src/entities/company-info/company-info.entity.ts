import { Entity, OneToMany, PrimaryColumn, Relation } from 'typeorm';
import { UserEntity } from '../user/user.entity.js';
import { ConnectionEntity } from '../connection/connection.entity.js';

@Entity('company_info')
export class CompanyInfoEntity {
  @PrimaryColumn('uuid')
  id: string;

  @OneToMany(() => UserEntity, (user) => user.company, {
    onDelete: 'NO ACTION',
  })
  users: Relation<UserEntity>[];

  @OneToMany(() => ConnectionEntity, (connection) => connection.company, {
    onDelete: 'NO ACTION',
  })
  connections: Relation<ConnectionEntity>[];
}
