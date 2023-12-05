import { ConnectionTypeEnum } from '../../../../enums/index.js';

export class UpdateConnectionDs {
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
  update_info: {
    authorId: string;
    connectionId: string;
    masterPwd: string;
  };
}
