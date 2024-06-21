/* eslint-disable @typescript-eslint/no-unused-vars */
import { Column, Entity, ManyToMany, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { TableActionEventEnum } from '../../../enums/table-action-event-enum.js';
import { ActionRulesEntity } from '../table-action-rules-module/action-rules.entity.js';

@Entity('action_events')
export class ActionEventsEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('enum', {
    nullable: false,
    enum: TableActionEventEnum,
    default: TableActionEventEnum.CUSTOM,
  })
  event!: TableActionEventEnum;

  @Column({ default: null })
  title: string;

  @Column({ default: null })
  icon: string;

  @Column({ default: null })
  table_name: string;

  @Column({ default: null })
  created_at: Date;

  @Column({ default: false })
  require_confirmation: boolean;

  @ManyToMany((type) => ActionRulesEntity, (rules) => rules.table_actions)
  action_rules: Relation<ActionRulesEntity>[];
}
