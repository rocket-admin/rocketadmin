import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { ConnectionEntity } from '../connection/connection.entity.js';

@Entity('connectionProperties')
export class ConnectionPropertiesEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { array: true, default: null })
  hidden_tables: string[];

  @Column({ default: null })
  logo_url: string;

  @Column({ default: null })
  primary_color: string;

  @Column({ default: null })
  secondary_color: string;

  @Column({ default: null })
  hostname: string;

  @OneToOne(() => ConnectionEntity, (connection) => connection.connection_properties, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  connection: Relation<ConnectionEntity>;
}
