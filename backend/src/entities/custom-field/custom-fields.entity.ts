import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TableSettingsEntity } from '../table-settings/table-settings.entity';

@Entity('customFields')
export class CustomFieldsEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  type: string;

  @Column()
  template_string: string;

  @Column()
  text: string;

  @ManyToOne(
    (type) => TableSettingsEntity,
    (settings) => settings.custom_fields,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn()
  settings: TableSettingsEntity;
}
