import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { ConnectionEntity } from '../connection/connection.entity.js';

@Entity('connectionProperties')
export class ConnectionPropertiesEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { array: true, default: null })
  hidden_tables: string[];

  @OneToOne((type) => ConnectionEntity, (connection) => connection.connection_properties, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  connection: Relation<ConnectionEntity>;
}
