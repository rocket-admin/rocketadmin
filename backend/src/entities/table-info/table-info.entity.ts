import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ConnectionEntity } from '../connection/connection.entity.js';
import { TableFieldInfoEntity } from '../table-field-info/table-field-info.entity.js';

@Entity('table_info')
export class TableInfoEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  table_name: string;

  @ManyToOne((type) => ConnectionEntity, (connection) => connection.tables_info, { onDelete: 'CASCADE' })
  @JoinColumn()
  connection: ConnectionEntity;

  @OneToMany((type) => TableFieldInfoEntity, (table_field_info) => table_field_info.table_info)
  table_fields_info: TableFieldInfoEntity[];
}
