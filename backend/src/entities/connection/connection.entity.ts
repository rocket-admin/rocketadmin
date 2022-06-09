import {
  AfterLoad,
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Expose } from 'class-transformer';
import { GroupEntity } from '../group/group.entity';
import { TableSettingsEntity } from '../table-settings/table-settings.entity';
import { UserEntity } from '../user/user.entity';
import { Encryptor } from '../../helpers/encryption/encryptor';
import { TableLogsEntity } from '../table-logs/table-logs.entity';
import { AgentEntity } from '../agent/agent.entity';
import { isConnectionTypeAgent } from '../../helpers';
import { ConnectionPropertiesEntity } from '../connection-properties/connection-properties.entity';

@Entity('connection')
export class ConnectionEntity {
  @Expose()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: '' })
  title?: string;

  @Column({ default: false })
  masterEncryption: boolean;

  @Column({ default: null })
  type?: string;

  @Column({ default: null })
  host?: string;

  @Column({ default: null })
  port?: number;

  @Column({ default: null })
  username?: string;

  @Column({ default: null })
  password?: string;

  @Column({ default: null })
  database?: string;

  @Column({ default: null })
  schema?: string;

  @Column({ default: null, length: 255 })
  sid?: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @Column({ default: false })
  ssh?: boolean;

  @Column({ default: null })
  privateSSHKey?: string;

  @Column({ default: null })
  sshHost?: string;

  @Column({ default: null })
  sshPort?: number;

  @Column({ default: null })
  sshUsername?: string;

  @Column({ default: false })
  ssl?: boolean;

  @Column({ default: null })
  cert?: string;

  @Column({ default: false })
  isTestConnection?: boolean;

  @Column({ default: false })
  azure_encryption?: boolean;

  @BeforeUpdate()
  updateTimestampEncryptCredentials(): void {
    this.updatedAt = new Date();
    if (!isConnectionTypeAgent(this.type)) {
      this.host = Encryptor.encryptData(this.host);
      this.database = Encryptor.encryptData(this.database);
      this.password = Encryptor.encryptData(this.password);
      this.username = Encryptor.encryptData(this.username);
      if (this.ssh) {
        this.privateSSHKey = Encryptor.encryptData(this.privateSSHKey);
        this.sshHost = Encryptor.encryptData(this.sshHost);
        this.sshUsername = Encryptor.encryptData(this.sshUsername);
      }
      if (this.ssl && this.cert) {
        this.cert = Encryptor.encryptData(this.cert);
      }
    }
  }

  @BeforeInsert()
  encryptCredentials(): void {
    if (!isConnectionTypeAgent(this.type)) {
      this.host = Encryptor.encryptData(this.host);
      this.database = Encryptor.encryptData(this.database);
      this.password = Encryptor.encryptData(this.password);
      this.username = Encryptor.encryptData(this.username);
      if (this.ssh) {
        this.privateSSHKey = Encryptor.encryptData(this.privateSSHKey);
        this.sshHost = Encryptor.encryptData(this.sshHost);
        this.sshUsername = Encryptor.encryptData(this.sshUsername);
      }
      if (this.ssl && this.cert) {
        this.cert = Encryptor.encryptData(this.cert);
      }
    }
  }

  @AfterLoad()
  decryptCredentials(): void {
    if (!isConnectionTypeAgent(this.type)) {
      this.host = Encryptor.decryptData(this.host);
      this.database = Encryptor.decryptData(this.database);
      this.password = Encryptor.decryptData(this.password);
      this.username = Encryptor.decryptData(this.username);
      if (this.ssh) {
        this.privateSSHKey = Encryptor.decryptData(this.privateSSHKey);
        this.sshHost = Encryptor.decryptData(this.sshHost);
        this.sshUsername = Encryptor.decryptData(this.sshUsername);
      }
      if (this.ssl && this.cert) {
        this.cert = Encryptor.decryptData(this.cert);
      }
    }
  }

  @ManyToOne((type) => UserEntity, (user) => user.connections, { cascade: true, onDelete: 'SET NULL' })
  author: UserEntity;

  @OneToMany((type) => GroupEntity, (group) => group.connection)
  groups: GroupEntity[];

  @OneToMany((type) => TableSettingsEntity, (settings) => settings.connection_id)
  settings: TableSettingsEntity[];

  @OneToMany((type) => TableLogsEntity, (logs) => logs.connection_id)
  logs: TableLogsEntity[];

  @OneToOne((type) => AgentEntity, (agent) => agent.connection)
  agent: AgentEntity;

  @OneToOne((type) => ConnectionPropertiesEntity, (connection_properties) => connection_properties.connection)
  connection_properties: ConnectionPropertiesEntity;
}
