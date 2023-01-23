import { ConnectionTypeEnum } from '../../../../enums/index.js';

export class CreateConnectionDs {
  connection_parameters: {
    title: string;
    masterEncryption: boolean;
    type: ConnectionTypeEnum;
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    schema: string;
    sid: string;
    ssh: boolean;
    privateSSHKey: string;
    sshHost: string;
    sshPort: number;
    sshUsername: string;
    ssl: boolean;
    cert: string;
    azure_encryption: boolean;
  };
  creation_info: {
    authorId: string;
    masterPwd: string;
  };
}
