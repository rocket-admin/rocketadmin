import { AccessLevelEnum } from '../../enums/index.js';
import { IUserData } from '../user/user.interface.js';

export interface IConnectionData {
  id: string;
  title?: string;
  masterEncryption: boolean;
  type?: string;
  host?: string;
  port?: number;
  username?: string;
  database?: string;
  schema?: string;
  sid?: string;
  createdAt?: Date;
  updatedAt?: Date;
  ssh?: boolean;
  sshHost?: string;
  sshPort?: number;
  ssl?: boolean;
  cert?: string;
  author?: IUserData;
  token?: string;
  azure_encryption?: boolean;
}

export interface IConnectionAccessRO {
  connection: IConnectionData;
  accessLevel: AccessLevelEnum;
}

