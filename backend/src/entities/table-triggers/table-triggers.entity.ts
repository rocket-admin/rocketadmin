import { Column, Entity, JoinColumn, ManyToMany, ManyToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { ConnectionEntity } from '../connection/connection.entity.js';
import { TableActionEntity } from '../table-actions/table-action.entity.js';
import { TableTriggerEventEnum } from '../../enums/table-trigger-event-enum.js';

@Entity('table_triggers')
export class TableTriggersEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: null })
  table_name: string;

  @ManyToOne(() => ConnectionEntity, (connection) => connection.table_triggers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  connection: Relation<ConnectionEntity>;

  @ManyToMany(() => TableActionEntity, (action) => action.table_triggers, { onDelete: 'CASCADE' })
  @JoinColumn()
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
