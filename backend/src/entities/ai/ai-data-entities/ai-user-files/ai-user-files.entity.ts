import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { AiUserThreadEntity } from '../ai-user-threads/ai-user-threads.entity.js';

@Entity('ai_user_files')
export class AiUserFileEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 128 })
  file_ai_id: string;

  @OneToOne((_) => AiUserThreadEntity, (thread) => thread.thread_file, { onDelete: 'CASCADE' })
  @JoinColumn()
  thread: Relation<AiUserThreadEntity>;
}
