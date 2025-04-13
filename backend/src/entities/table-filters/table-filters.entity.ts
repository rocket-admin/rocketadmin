import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Relation, Unique } from 'typeorm';
import { ConnectionEntity } from '../connection/connection.entity.js';

@Entity('table_filters')
@Unique(['connectionId', 'table_name'])
export class TableFiltersEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'jsonb', nullable: true })
  filters: Record<string, any>;

  @Column({ default: null })
  table_name: string;

  @ManyToOne((_) => ConnectionEntity, (connection) => connection.table_filters, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'connectionId' })
  connection: Relation<ConnectionEntity>;

  @Column()
  connectionId: string;
}
