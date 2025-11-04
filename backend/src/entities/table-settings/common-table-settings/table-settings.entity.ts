import { Transform } from 'class-transformer';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, Relation, Unique } from 'typeorm';
import { QueryOrderingEnum } from '../../../enums/index.js';
import { ConnectionEntity } from '../../connection/connection.entity.js';
import { CustomFieldsEntity } from '../../custom-field/custom-fields.entity.js';
import { TableActionEntity } from '../../table-actions/table-actions-module/table-action.entity.js';
import { TableWidgetEntity } from '../../widget/table-widget.entity.js';

@Entity('tableSettings')
@Unique(['connection_id', 'table_name'])
export class TableSettingsEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: null })
  table_name: string;

  @Column({ default: null })
  display_name: string;

  @Column('varchar', { array: true, default: {} })
  search_fields: string[];

  @Column('varchar', { array: true, default: {} })
  excluded_fields: string[];

  @Column('varchar', { array: true, default: {} })
  list_fields: string[];

  @Column('varchar', { array: true, default: {} })
  identification_fields: string[];

  @Column('int', { default: null })
  list_per_page: number;

  @Column('enum', {
    nullable: false,
    enum: QueryOrderingEnum,
    default: QueryOrderingEnum.ASC,
  })
  ordering!: QueryOrderingEnum;

  @Column('varchar', { default: null })
  ordering_field: string;

  @Column({ default: null })
  identity_column: string;

  @Column('varchar', { array: true, default: {} })
  readonly_fields: string[];

  @Column('varchar', { array: true, default: {} })
  sortable_by: string[];

  @Column('varchar', { array: true, default: {} })
  autocomplete_columns: string[];

  @Column('varchar', { array: true, default: null })
  columns_view: string[];

  @Column({ default: true, type: 'boolean' })
  can_delete: boolean;

  @Column({ default: true, type: 'boolean' })
  can_update: boolean;

  @Column({ default: true, type: 'boolean' })
  can_add: boolean;

  @Column({ default: true, type: 'boolean' })
  allow_csv_export: boolean;

  @Column({ default: true, type: 'boolean' })
  allow_csv_import: boolean;

  @Column('varchar', { array: true, default: null })
  sensitive_fields: string[];

  @Column('varchar', { default: null })
  icon: string;

  @Transform(({ value: connection }) => connection.id)
  @ManyToOne((_) => ConnectionEntity, (connection) => connection.settings, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  connection_id: Relation<ConnectionEntity>;

  @OneToMany((_) => CustomFieldsEntity, (fields) => fields.settings)
  custom_fields: Relation<CustomFieldsEntity>[];

  @OneToMany((_) => TableWidgetEntity, (table_widgets) => table_widgets.settings)
  table_widgets: Relation<TableWidgetEntity>[];

  @OneToMany((_) => TableActionEntity, (table_actions) => table_actions.settings)
  table_actions: Relation<TableActionEntity>[];
}
