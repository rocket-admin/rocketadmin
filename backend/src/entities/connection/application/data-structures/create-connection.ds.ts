import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/shared/enums/connection-types-enum.js';

export class CreateConnectionDs {
  connection_parameters: {
    title: string;
    masterEncryption: boolean;
    type: ConnectionTypesEnum;
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
    authSource: string;
    dataCenter: string;
  };
  creation_info: {
    authorId: string;
    masterPwd: string;
  };
}
