export class ConnectionParams {
  id: string;

  title: string | null;

  masterEncryption: boolean;

  type: 'postgres' | 'oracledb' | 'mysql2' | 'mssql';

  host: string;

  port: number;

  username: string;

  password: string;

  database: string;

  schema?: string | null;

  sid?: string | null;

  ssh: boolean;

  privateSSHKey?: string | null;

  sshHost: string | null;

  sshPort: number | null;

  sshUsername: string | null;

  ssl: boolean | null;

  cert: string | null;

  isTestConnection: boolean | null;

  azure_encryption: boolean | null;

  saved_table_info: number | null;

  signing_key: string;
}

export class ConnectionAgentParams {
  id: string;
  title?: string | null;
  createdAt: Date;
  updatedAt: Date;
  isTestConnection?: boolean | null;
  signing_key: string;
}
