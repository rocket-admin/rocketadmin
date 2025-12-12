import { Column, Entity, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { ConnectionEntity } from '../connection/connection.entity.js';
import { TableCategoriesEntity } from '../table-categories/table-categories.entity.js';

@Entity('connectionProperties')
export class ConnectionPropertiesEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { array: true, default: null })
  hidden_tables: string[];

  @Column({ default: null })
  logo_url: string;

  @Column({ default: '' })
  primary_color: string;

  @Column({ default: '' })
  secondary_color: string;

  @Column({ default: null })
  hostname: string;

  @Column({ default: null })
  company_name: string;

  @Column({ default: true, type: 'boolean' })
  tables_audit: boolean;

  @Column({ default: true, type: 'boolean' })
  human_readable_table_names: boolean;

  @Column({ default: true, type: 'boolean' })
  allow_ai_requests: boolean;

  @Column({ default: null })
  default_showing_table: string;

  @OneToOne((_) => ConnectionEntity, (connection) => connection.connection_properties, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  connection: Relation<ConnectionEntity>;

  @OneToMany(() => TableCategoriesEntity, (table_categories) => table_categories.connection_properties)
  table_categories: Relation<TableCategoriesEntity[]>;
}
