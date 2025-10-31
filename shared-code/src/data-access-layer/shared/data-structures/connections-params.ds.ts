export class ConnectionParams {
  id: string;

  title: string | null;

  type:
    | 'postgres'
    | 'oracledb'
    | 'mysql2'
    | 'mssql'
    | 'ibmdb2'
    | 'mongodb'
    | 'dynamodb'
    | 'elasticsearch'
    | 'cassandra'
    | 'redis';

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

  azure_encryption: boolean | null;

  signing_key: string;

  authSource: string | null;

  dataCenter?: string | null;

  isTestConnection: boolean;
}

export class ConnectionAgentParams {
  id: string;
  title?: string | null;
  signing_key: string;
  token: string;
  type: string;
  isTestConnection: boolean;
}
