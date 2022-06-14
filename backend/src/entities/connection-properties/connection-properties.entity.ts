import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ConnectionEntity } from '../connection/connection.entity';

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
  connection: ConnectionEntity;
}
