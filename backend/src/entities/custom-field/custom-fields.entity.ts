import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { TableSettingsEntity } from '../table-settings/common-table-settings/table-settings.entity.js';

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

  @ManyToOne(() => TableSettingsEntity, (settings) => settings.custom_fields, { onDelete: 'CASCADE' })
  @JoinColumn()
  settings: Relation<TableSettingsEntity>;
}
