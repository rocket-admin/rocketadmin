import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { TableInfoEntity } from '../table-info/table-info.entity';

@Entity('table_field_info')
export class TableFieldInfoEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: null })
  allow_null: boolean;

  @Column({ default: null })
  character_maximum_length: string;

  @Column({ default: null })
  column_default: string;

  @Column({ default: null })
  column_name: string;

  @Column({ default: null })
  data_type: string;

  @Column({ default: null })
  data_type_params: string;

  @Column({ default: null })
  udt_name: string;

  @ManyToOne((type) => TableInfoEntity, (table_info) => table_info.table_fields_info, { onDelete: 'CASCADE' })
  @JoinColumn()
  table_info: TableInfoEntity;
}
