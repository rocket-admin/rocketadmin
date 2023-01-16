import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { UserEntity } from '../user.entity.js';

@Entity('email_change')
export class EmailChangeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: null })
  verification_string: string;

  @OneToOne(() => UserEntity, (user) => user.email_change, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: UserEntity;
}
