import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { ConnectionEntity } from '../connection/connection.entity.js';
import { TableFieldInfoEntity } from '../table-field-info/table-field-info.entity.js';

@Entity('table_info')
export class TableInfoEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  table_name: string;

  @ManyToOne(() => ConnectionEntity, (connection) => connection.tables_info, { onDelete: 'CASCADE' })
  @JoinColumn()
  connection: Relation<ConnectionEntity>;

  @OneToMany(() => TableFieldInfoEntity, (table_field_info) => table_field_info.table_info)
  table_fields_info: Relation<TableFieldInfoEntity>[];
}
