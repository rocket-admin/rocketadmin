import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable } from 'typeorm';
import { GroupEntity } from '../group/group.entity.js';

@Entity('permission')
export class PermissionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  type: string;

  @Column()
  accessLevel: string;

  @Column({ default: '' })
  tableName?: string; //todo need reworking to required

  @ManyToMany(() => GroupEntity, (group) => group.permissions)
  @JoinTable()
  groups: GroupEntity[];
}
