/* eslint-disable @typescript-eslint/no-unused-vars */
import { BeforeInsert, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { UserEntity } from '../user/user.entity.js';
import { Encryptor } from '../../helpers/encryption/encryptor.js';
import { EncryptionAlgorithmEnum } from '../../enums/encryption-algorithm.enum.js';

@Entity('user_api_key')
export class UserApiKeyEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: false, nullable: false })
  title: string;

  @Column({ type: 'varchar', unique: true, nullable: false })
  hash: string;

  @ManyToOne((type) => UserEntity, (user) => user.api_keys, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: Relation<UserEntity>;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @BeforeInsert()
  async generateHash() {
    this.hash = await Encryptor.processDataWithAlgorithm(this.hash, EncryptionAlgorithmEnum.sha256);
  }
}
