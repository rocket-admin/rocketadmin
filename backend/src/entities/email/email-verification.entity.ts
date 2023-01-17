import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { UserEntity } from '../user/user.entity.js';

@Entity('email_verification')
export class EmailVerificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: null })
  verification_string: string;

  @OneToOne(() => UserEntity, (user) => user.email_verification, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: Relation<UserEntity>;
}
