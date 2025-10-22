import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { ConnectionPropertiesEntity } from '../connection-properties/connection-properties.entity.js';

@Entity('table_categories')
export class TableCategoriesEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  category_name: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  category_id: string;

  @Column({ type: 'varchar', length: 255, default: null, nullable: true })
  category_color: string;

  @Column('varchar', { array: true, default: null })
  tables: string[];

  @ManyToOne(() => ConnectionPropertiesEntity, (connection_properties) => connection_properties.table_categories, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'connection_properties_id' })
  connection_properties: Relation<ConnectionPropertiesEntity>;

  @Column()
  connection_properties_id: string;
}
