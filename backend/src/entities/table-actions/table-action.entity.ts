import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { TableActionTypeEnum } from '../../enums/index.js';
import { TableSettingsEntity } from '../table-settings/table-settings.entity.js';

@Entity('table_actions')
export class TableActionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: null })
  title: string;

  @Column('enum', {
    nullable: false,
    enum: TableActionTypeEnum,
    default: TableActionTypeEnum.single,
  })
  type!: TableActionTypeEnum;

  @Column({ default: null })
  url: string;

  @Column({ default: null })
  icon: string;

  @ManyToOne(() => TableSettingsEntity, (settings) => settings.table_actions, { onDelete: 'CASCADE' })
  @JoinColumn()
  settings: Relation<TableSettingsEntity>;
}
