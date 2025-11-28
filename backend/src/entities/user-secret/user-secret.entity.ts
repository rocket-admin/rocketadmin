import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
  UpdateDateColumn,
} from 'typeorm';
import { CompanyInfoEntity } from '../company-info/company-info.entity.js';
import { SecretAccessLogEntity } from '../secret-access-log/secret-access-log.entity.js';

@Entity('user_secrets')
@Index(['companyId', 'slug'], { unique: true })
export class UserSecretEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => CompanyInfoEntity, { onDelete: 'CASCADE' })
  @JoinColumn()
  company: Relation<CompanyInfoEntity>;

  @Column()
  @Index()
  companyId: string;

  @Column({ type: 'varchar', length: 255 })
  slug: string;

  @Column({ type: 'text' })
  encryptedValue: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastAccessedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ default: false })
  masterEncryption: boolean;

  @Column({ type: 'varchar', length: 4096, nullable: true })
  masterHash: string;

  @OneToMany(() => SecretAccessLogEntity, (log) => log.secret)
  accessLogs: Relation<SecretAccessLogEntity>[];
}
