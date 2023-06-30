import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { UserEntity } from '../user.entity.js';

@Entity('github_user_identifier')
export class GitHubUserIdentifierEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  gitHubId: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @OneToOne(() => UserEntity, (user) => user.github_user_identifier, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: Relation<UserEntity>;
}
