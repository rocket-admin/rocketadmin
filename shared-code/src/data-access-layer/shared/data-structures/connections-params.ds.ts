export class ConnectionParams {
  id: string;

  title?: string;

  masterEncryption: boolean;

  type?: string;

  host?: string;

  port?: number;

  username?: string;

  password?: string;

  database?: string;

  schema?: string;

  sid?: string;

  createdAt: Date;

  updatedAt: Date;

  ssh?: boolean;

  privateSSHKey?: string;

  sshHost?: string;

  sshPort?: number;

  sshUsername?: string;

  ssl?: boolean;

  cert?: string;

  isTestConnection?: boolean;

  azure_encryption?: boolean;

  saved_table_info?: number;

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
