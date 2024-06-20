/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';
import { ConnectionEntity } from '../connection/connection.entity.js';
import { TableActionEntity } from '../table-actions/table-actions-module/table-action.entity.js';

@Entity('action_rules')
export class ActionRulesEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: null })
  table_name: string;

  @Column({ default: null })
  title: string;

  @ManyToOne(() => ConnectionEntity, (connection) => connection.action_rules, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  connection: Relation<ConnectionEntity>;

  @ManyToMany((type) => TableActionEntity, (action) => action.action_rules, { onDelete: 'CASCADE' })
  @JoinTable({
    name: 'rules_actions',
    joinColumn: {
      name: 'action_rules',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'table_actions',
      referencedColumnName: 'id',
    },
  })
  table_actions: Relation<TableActionEntity>[];

  @Column({ default: null })
  created_at: Date;
}
