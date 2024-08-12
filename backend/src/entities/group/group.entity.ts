import { Column, Entity, JoinColumn, ManyToMany, ManyToOne, PrimaryGeneratedColumn, Relation, Unique } from 'typeorm';
import { UserEntity } from '../user/user.entity.js';
import { PermissionEntity } from '../permission/permission.entity.js';
import { ConnectionEntity } from '../connection/connection.entity.js';

@Entity('group')
@Unique(['connection', 'title'])
export class GroupEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ default: false })
  isMain: boolean;

  @ManyToMany((_) => PermissionEntity, (permission) => permission.groups, {
    onDelete: 'CASCADE',
  })
  permissions?: Relation<PermissionEntity>[];

  @ManyToMany((_) => UserEntity, (user) => user.groups, {
    onDelete: 'CASCADE',
  })
  users?: Relation<UserEntity>[];

  @ManyToOne((_) => ConnectionEntity, (connection) => connection.groups, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  connection: Relation<ConnectionEntity>;
}
