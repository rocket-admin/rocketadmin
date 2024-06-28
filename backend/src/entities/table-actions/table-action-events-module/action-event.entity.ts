/* eslint-disable @typescript-eslint/no-unused-vars */
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
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

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ default: false })
  require_confirmation: boolean;

  @ManyToOne((type) => ActionRulesEntity, (rules) => rules.table_actions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'action_rule_id' })
  action_rule: Relation<ActionRulesEntity>;
}
