/* eslint-disable @typescript-eslint/no-unused-vars */
import { Column, Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn, Relation } from 'typeorm';
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

  @ManyToMany((type) => ActionEventsEntity, (event) => event.action_rules, { onDelete: 'CASCADE' })
  @JoinTable({
    name: 'rules_events',
    joinColumn: {
      name: 'action_rules',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'action_events',
      referencedColumnName: 'id',
    },
  })
  action_events: Relation<ActionEventsEntity>[];

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}
