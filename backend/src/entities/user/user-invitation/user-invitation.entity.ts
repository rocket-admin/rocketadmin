import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { UserEntity } from '../user.entity.js';

@Entity('user_invitation')
export class UserInvitationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: null })
  verification_string: string;

  @Column({ default: null })
  ownerId: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @OneToOne(() => UserEntity, (user) => user.user_invitation, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: UserEntity;
}
