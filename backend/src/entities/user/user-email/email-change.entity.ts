import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { UserEntity } from '../user.entity';

@Entity('email_change')
export class EmailChangeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: null })
  verification_string: string;

  @OneToOne(() => UserEntity, (user) => user.email_change, { cascade: true, onDelete: 'CASCADE' })
  @JoinColumn()
  user: UserEntity;
}
