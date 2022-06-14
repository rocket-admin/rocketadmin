import { Entity, PrimaryColumn } from 'typeorm';

@Entity('job_list')
export class JobListEntity {
  @PrimaryColumn('varchar', { length: 100, unique: true, onUpdate: 'NO ACTION' })
  job_key: string;
}
