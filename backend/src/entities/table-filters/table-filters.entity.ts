import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';
import { ConnectionEntity } from '../connection/connection.entity.js';
import { FilterCriteriaEnum } from '../../enums/filter-criteria.enum.js';

@Entity('table_filters')
export class TableFiltersEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'jsonb', nullable: true })
  filters: Record<string, any>;

  @Column({ default: null })
  table_name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  dynamic_filter_column_name: string | null;

  @Column('enum', {
    nullable: true,
    enum: FilterCriteriaEnum,
    default: null,
  })
  dynamic_filter_comparator: FilterCriteriaEnum | null;

  @ManyToOne((_) => ConnectionEntity, (connection) => connection.table_filters, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'connectionId' })
  connection: Relation<ConnectionEntity>;

  @Column()
  connectionId: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: null })
  updatedAt: Date;

  @BeforeInsert()
  setDefaultName(): void {
    if (!this.name) {
      this.name = 'New filter';
    }
  }

  @BeforeUpdate()
  updateTimestamp(): void {
    this.updatedAt = new Date();
  }
}
