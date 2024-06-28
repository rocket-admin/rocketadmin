/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';
import { TableActionEntity } from '../table-actions-module/table-action.entity.js';
import { ActionEventsEntity } from '../table-action-events-module/action-event.entity.js';

@Entity('action_rules')
export class ActionRulesEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: null })
  table_name: string;

  @Column({ default: null })
  title: string;

  @OneToMany((type) => TableActionEntity, (action) => action.action_rule)
  table_actions: Relation<TableActionEntity>[];

  @OneToMany((type) => ActionEventsEntity, (event) => event.action_rule)
  action_events: Relation<ActionEventsEntity>[];

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}
