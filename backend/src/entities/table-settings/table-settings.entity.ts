import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { ConnectionEntity } from '../connection/connection.entity';
import { CustomFieldsEntity } from '../custom-field/custom-fields.entity';
import { QueryOrderingEnum } from '../../enums';
import { TableWidgetEntity } from '../widget/table-widget.entity';
import { Transform } from 'class-transformer';

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

  @Transform(({ value: connection }) => connection.id)
  @ManyToOne((type) => ConnectionEntity, (connection) => connection.settings, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  connection_id: ConnectionEntity;

  @OneToMany((type) => CustomFieldsEntity, (fields) => fields.settings)
  custom_fields: CustomFieldsEntity[];

  @OneToMany((type) => TableWidgetEntity, (table_widgets) => table_widgets.settings)
  table_widgets: TableWidgetEntity[];
}
