import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { TableActionTypeEnum } from '../../enums';
import { TableSettingsEntity } from '../table-settings/table-settings.entity';

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
  settings: TableSettingsEntity;
}
