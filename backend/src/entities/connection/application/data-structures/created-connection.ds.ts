import { ConnectionTypeEnum } from '../../../../enums';
import { GroupEntity } from '../../../group/group.entity';

export class CreatedConnectionDs {
  id: string;
  title: string;
  masterEncryption: boolean;
  type: ConnectionTypeEnum | string;
  host: string;
  port: number;
  username: string;
  database: string;
  schema: string;
  sid: string;
  ssh: boolean;
  sshHost: string;
  sshPort: number;
  sshUsername: string;
  ssl: boolean;
  cert: string;
  azure_encryption: boolean;
  token: string | null;
  createdAt: Date;
  updatedAt: Date;
  isTestConnection: boolean;
  author: string;
  groups: Array<GroupEntity>;
}
