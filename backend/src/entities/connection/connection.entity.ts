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
  PrimaryColumn,
  Relation,
} from 'typeorm';
import { isConnectionTypeAgent } from '../../helpers/index.js';
import { Encryptor } from '../../helpers/encryption/encryptor.js';
import { AgentEntity } from '../agent/agent.entity.js';
import { ConnectionPropertiesEntity } from '../connection-properties/connection-properties.entity.js';
import { GroupEntity } from '../group/group.entity.js';
import { TableInfoEntity } from '../table-info/table-info.entity.js';
import { TableLogsEntity } from '../table-logs/table-logs.entity.js';
import { TableSettingsEntity } from '../table-settings/common-table-settings/table-settings.entity.js';
import { UserEntity } from '../user/user.entity.js';
import { CompanyInfoEntity } from '../company-info/company-info.entity.js';
import { ActionRulesEntity } from '../table-actions/table-action-rules-module/action-rules.entity.js';
import { nanoid } from 'nanoid';
import { Constants } from '../../helpers/constants/constants.js';
import { TableFiltersEntity } from '../table-filters/table-filters.entity.js';

@Entity('connection')
export class ConnectionEntity {
  @Expose()
  @PrimaryColumn('varchar', { length: 38 })
  id: string;

  @Column({ default: '' })
  title?: string;

  @Column({ default: false, type: 'boolean' })
  masterEncryption: boolean;

  @Column({ default: null })
  type?: string | null;

  @Column({ default: null })
  host?: string | null;

  @Column({ default: null })
  port?: number;

  @Column({ default: null })
  username?: string | null;

  @Column({ default: null })
  password?: string | null;

  @Column({ default: null })
  database?: string | null;

  @Column({ default: null })
  schema?: string | null;

  @Column({ default: null, length: 255 })
  sid?: string | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @Column({ default: false, type: 'boolean' })
  ssh?: boolean;

  @Column({ default: null })
  privateSSHKey?: string | null;

  @Column({ default: null })
  sshHost?: string | null;

  @Column({ default: null })
  sshPort?: number | null;

  @Column({ default: null })
  sshUsername?: string | null;

  @Column({ default: false, type: 'boolean' })
  ssl?: boolean | null;

  @Column({ default: null })
  cert?: string | null;

  @Column({ default: false, type: 'boolean' })
  isTestConnection: boolean;

  @Column({ default: false, type: 'boolean' })
  azure_encryption: boolean;

  @Column({ default: false, type: 'boolean' })
  is_frozen: boolean;

  @Column({ default: 0 })
  saved_table_info: number;

  @Column({ default: null })
  signing_key: string;

  @Column({ default: null })
  authSource?: string | null;

  @Column({ default: null })
  dataCenter?: string | null;

  @Column({ default: null })
  master_hash?: string | null;

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
  encryptCredentialsAndGenerateNanoid(): void {
    if (!this.id) {
      this.id = nanoid(8);
    }
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
    if (this.isTestConnection) {
      const testConnectionsArray = Constants.getTestConnectionsArr();
      const foundTestConnectionByType = testConnectionsArray.find(
        (testConnection) => testConnection.type === this.type,
      );
      if (foundTestConnectionByType) {
        this.host = foundTestConnectionByType.host;
        this.database = foundTestConnectionByType.database;
        this.username = foundTestConnectionByType.username;
        this.password = foundTestConnectionByType.password;
        this.port = foundTestConnectionByType.port;
        this.ssh = foundTestConnectionByType.ssh;
        this.privateSSHKey = foundTestConnectionByType.privateSSHKey;
        this.sshHost = foundTestConnectionByType.sshHost;
        this.sshPort = foundTestConnectionByType.sshPort;
        this.sshUsername = foundTestConnectionByType.sshUsername;
        this.ssl = foundTestConnectionByType.ssl;
        this.cert = foundTestConnectionByType.cert;
        this.authSource = foundTestConnectionByType.authSource;
        this.sid = foundTestConnectionByType.sid;
        this.schema = foundTestConnectionByType.schema;
        this.cert = foundTestConnectionByType.cert;
        this.azure_encryption = foundTestConnectionByType.azure_encryption;
      }
    } else {
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
  }

  @ManyToOne((_) => UserEntity, (user) => user.connections, { onDelete: 'SET NULL', nullable: true })
  author: Relation<UserEntity>;

  @OneToMany((_) => GroupEntity, (group) => group.connection)
  groups: Relation<GroupEntity>[];

  @OneToMany((_) => TableSettingsEntity, (settings) => settings.connection_id)
  settings: Relation<TableSettingsEntity>[];

  @OneToMany((_) => TableLogsEntity, (logs) => logs.connection_id)
  logs: Relation<TableLogsEntity>[];

  @OneToMany((_) => ActionRulesEntity, (action_rules) => action_rules.connection)
  action_rules: Relation<ActionRulesEntity>[];

  @OneToOne((_) => AgentEntity, (agent) => agent.connection)
  agent: Relation<AgentEntity>;

  @OneToOne((_) => ConnectionPropertiesEntity, (connection_properties) => connection_properties.connection)
  connection_properties: Relation<ConnectionPropertiesEntity>;

  @OneToMany((_) => TableInfoEntity, (table_info) => table_info.connection)
  tables_info: Relation<TableInfoEntity>[];

  @ManyToOne((_) => CompanyInfoEntity, (company) => company.connections)
  @JoinTable()
  company: Relation<CompanyInfoEntity>;

  @OneToMany((_) => TableFiltersEntity, (table_filters) => table_filters.connection)
  table_filters: Relation<TableFiltersEntity>[];
}
