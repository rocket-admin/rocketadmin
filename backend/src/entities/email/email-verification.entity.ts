import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { UserEntity } from '../user/user.entity';

@Entity('email_verification')
export class EmailVerificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: null })
  verification_string: string;

  @OneToOne(() => UserEntity, (user) => user.email_verification, { cascade: true, onDelete: 'CASCADE' })
  @JoinColumn()
  user: UserEntity;
}
