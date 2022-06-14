import { AccessLevelEnum } from '../../enums';
import { IUserData } from '../user/user.interface';

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

export interface IConnectionRO {
  connection: IConnectionData;
}

export interface IConnectionAccessRO {
  connection: IConnectionData;
  accessLevel: AccessLevelEnum;
}

export interface IOneConnectionAccessRO {
  connection: IConnectionData;
  accessLevel: AccessLevelEnum;
  groupManagement: boolean;
}

export interface IAllConnectionsRO {
  connections: Array<IConnectionAccessRO>;
  connectionsCount: number;
}
