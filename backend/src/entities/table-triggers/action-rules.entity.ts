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
import { TableActionEntity } from '../table-actions/table-action.entity.js';
import { TableTriggerEventEnum } from '../../enums/table-trigger-event-enum.js';

@Entity('action_rules')
export class ActionRulesEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: null })
  table_name: string;

  @Column({ default: null })
  icon: string;

  @Column({ default: null })
  title: string;

  @ManyToOne(() => ConnectionEntity, (connection) => connection.action_rules, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  connection: Relation<ConnectionEntity>;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  @Column('enum', {
    enum: TableTriggerEventEnum,
    array: true,
    default: [TableTriggerEventEnum.ADD_ROW],
    nullable: false,
  })
  trigger_events!: TableTriggerEventEnum[];
}
