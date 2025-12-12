import { BeforeUpdate, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { UserEntity } from '../../../user/user.entity.js';

@Entity('ai_responses_to_user')
export class AiResponsesToUserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  ai_response_id: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: null, nullable: true })
  updatedAt: Date;

  @Column()
  user_id: string;

  @ManyToOne((_) => UserEntity, (user) => user.ai_responses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Relation<UserEntity>;

  @BeforeUpdate()
  updateTimestamp() {
    this.updatedAt = new Date();
  }
}
