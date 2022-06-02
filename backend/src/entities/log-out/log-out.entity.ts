import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('logout')
export class LogOutEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: null })
  jwtToken: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
