import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { UserEntity } from '../user/user.entity.js';

@Entity('user_action')
export class UserActionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: null })
  message: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ default: false })
  mail_sent: boolean;

  @OneToOne(() => UserEntity, (user) => user.user_action, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: Relation<UserEntity>;
}
