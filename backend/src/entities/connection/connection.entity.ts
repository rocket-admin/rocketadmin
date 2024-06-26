import { Expose } from 'class-transformer';
import {
  AfterLoad,
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  JoinTable,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';
import { isConnectionTypeAgent } from '../../helpers/index.js';
import { Encryptor } from '../../helpers/encryption/encryptor.js';
import { AgentEntity } from '../agent/agent.entity.js';
import { ConnectionPropertiesEntity } from '../connection-properties/connection-properties.entity.js';
import { GroupEntity } from '../group/group.entity.js';
import { TableInfoEntity } from '../table-info/table-info.entity.js';
import { TableLogsEntity } from '../table-logs/table-logs.entity.js';
import { TableSettingsEntity } from '../table-settings/table-settings.entity.js';
import { UserEntity } from '../user/user.entity.js';
import { CompanyInfoEntity } from '../company-info/company-info.entity.js';
import { TableTriggersEntity } from '../table-triggers/table-triggers.entity.js';

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

  @Column({ default: 0 })
  saved_table_info?: number;

  @Column({ default: null })
  signing_key: string;

  @Column({ default: null })
  authSource?: string;

  @BeforeUpdate()
  updateTimestampEncryptCredentials(): void {
    this.updatedAt = new Date();
    if (!isConnectionTypeAgent(this.type)) {
      this.host = Encryptor.encryptData(this.host);
      this.database = Encryptor.encryptData(this.database);
      this.password = Encryptor.encryptData(this.password);
      this.username = Encryptor.encryptData(this.username);
      if (this.authSource) {
        this.authSource = Encryptor.encryptData(this.authSource);
      }
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
    this.signing_key = Encryptor.generateRandomString(40);
    if (process.env.NODE_ENV === 'test') {
      this.signing_key = 'test';
    }
    if (!isConnectionTypeAgent(this.type)) {
      this.host = Encryptor.encryptData(this.host);
      this.database = Encryptor.encryptData(this.database);
      this.password = Encryptor.encryptData(this.password);
      this.username = Encryptor.encryptData(this.username);
      if (this.authSource) {
        this.authSource = Encryptor.encryptData(this.authSource);
      }
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
      if (this.authSource) {
        this.authSource = Encryptor.decryptData(this.authSource);
      }
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

  @ManyToOne(() => UserEntity, (user) => user.connections, { onDelete: 'SET NULL', nullable: true })
  author: Relation<UserEntity>;

  @OneToMany(() => GroupEntity, (group) => group.connection)
  groups: Relation<GroupEntity>[];

  @OneToMany(() => TableSettingsEntity, (settings) => settings.connection_id)
  settings: Relation<TableSettingsEntity>[];

  @OneToMany(() => TableTriggersEntity, (triggers) => triggers.connection)
  table_triggers: Relation<TableTriggersEntity>[];

  @OneToMany(() => TableLogsEntity, (logs) => logs.connection_id)
  logs: Relation<TableLogsEntity>[];

  @OneToOne(() => AgentEntity, (agent) => agent.connection)
  agent: Relation<AgentEntity>;

  @OneToOne(() => ConnectionPropertiesEntity, (connection_properties) => connection_properties.connection)
  connection_properties: Relation<ConnectionPropertiesEntity>;

  @OneToMany(() => TableInfoEntity, (table_info) => table_info.connection)
  tables_info: Relation<TableInfoEntity>[];

  @ManyToOne(() => CompanyInfoEntity, (company) => company.connections)
  @JoinTable()
  company: Relation<CompanyInfoEntity>;
}
