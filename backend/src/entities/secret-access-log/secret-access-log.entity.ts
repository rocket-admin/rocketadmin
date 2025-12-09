import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { UserEntity } from '../user/user.entity.js';
import { UserSecretEntity } from '../user-secret/user-secret.entity.js';

export enum SecretActionEnum {
  CREATE = 'create',
  VIEW = 'view',
  COPY = 'copy',
  UPDATE = 'update',
  DELETE = 'delete',
}

@Entity('secret_access_logs')
export class SecretAccessLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => UserSecretEntity, (secret) => secret.accessLogs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'secretId' })
  secret: Relation<UserSecretEntity>;

  @Column()
  @Index()
  secretId: string;

  @ManyToOne(() => UserEntity, (user) => user.secretAccessLogs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: Relation<UserEntity>;

  @Column()
  @Index()
  userId: string;

  @Column({
    type: 'enum',
    enum: SecretActionEnum,
  })
  action: SecretActionEnum;

  @CreateDateColumn()
  @Index()
  accessedAt: Date;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress: string;

  @Column({ type: 'text', nullable: true })
  userAgent: string;

  @Column({ default: true })
  success: boolean;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;
}
