import {
  Column,
  Entity,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { UserEntity } from '../user/user.entity';
import { PermissionEntity } from '../permission/permission.entity';
import { ConnectionEntity } from '../connection/connection.entity';

@Entity('group')
@Unique(['connection', 'title'])
export class GroupEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ default: false })
  isMain: boolean;

  @ManyToMany(() => PermissionEntity, (permission) => permission.groups, {
    onDelete: 'CASCADE',
  })
  permissions?: PermissionEntity[];

  @ManyToMany((type) => UserEntity, (user) => user.groups, {
    onDelete: 'CASCADE',
  })
  users?: UserEntity[];

  @ManyToOne((type) => ConnectionEntity, (connection) => connection.groups, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  connection: ConnectionEntity;
}
