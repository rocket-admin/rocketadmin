export class CreateConnectionDto {
  title?: string;

  masterEncryption: boolean;

  type: string;

  host: string;

  port: number;

  username: string;

  password: string;

  database: string;

  schema: string;

  sid: string;

  ssh?: boolean;

  privateSSHKey?: string;

  sshHost?: string;

  sshPort?: number;

  sshUsername?: string;

  ssl?: boolean;

  cert?: string;

  azure_encryption?: boolean;

  isTestConnection?: boolean;
}
