import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('job_list')
export class JobListEntity {
  @PrimaryColumn({ type: 'int', nullable: false, unique: true })
  id: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
