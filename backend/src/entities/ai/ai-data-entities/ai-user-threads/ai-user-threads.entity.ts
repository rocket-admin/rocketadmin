import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { UserEntity } from '../../../user/user.entity.js';
import { AiUserFileEntity } from '../ai-user-files/ai-user-files.entity.js';

@Entity('ai_user_threads')
export class AiUserThreadEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 128 })
  thread_ai_id: string;

  @OneToOne((_) => AiUserFileEntity, (file) => file.thread)
  thread_file: Relation<AiUserFileEntity>;

  @ManyToOne((_) => UserEntity, (user) => user.ai_threads, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: Relation<UserEntity>;
}
