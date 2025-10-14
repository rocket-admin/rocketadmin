import { UserEntity } from '../../user/user.entity.js';
import { ConnectionEntity } from '../connection.entity.js';

export interface IConnectionRepository {
  saveNewConnection(connection: ConnectionEntity): Promise<ConnectionEntity>;

  findAllUserConnections(userId: string, includeTestConnections: boolean): Promise<Array<ConnectionEntity>>;

  findAllUserNonTestsConnections(userId: string): Promise<Array<ConnectionEntity>>;

  findAllUsersInConnection(connectionId): Promise<Array<UserEntity>>;

  findOneConnection(connectionId: string): Promise<ConnectionEntity>;

  findAndDecryptConnection(connectionId: string, masterPwd: string): Promise<ConnectionEntity>;

  removeConnection(connection: ConnectionEntity): Promise<ConnectionEntity>;

  findConnectionWithGroups(connectionId: string): Promise<ConnectionEntity>;

  getWorkedConnectionsInTwoWeeks(): Promise<Array<ConnectionEntity>>;

  getConnectionByGroupIdWithCompanyAndUsersInCompany(groupId: string): Promise<ConnectionEntity>;

  findOneById(connectionId: string): Promise<ConnectionEntity>;

  isTestConnectionById(connectionId: string): Promise<boolean>;

  saveUpdatedConnection(connection: ConnectionEntity): Promise<ConnectionEntity>;

  findOneAgentConnectionByToken(connectionToken: string): Promise<ConnectionEntity>;

  decryptConnectionField(field: string): string;

  findAllUserTestConnections(userId: string): Promise<Array<ConnectionEntity>>;

  isUserFromConnection(userId: string, connectionId: string): Promise<boolean>;

  findAllCompanyUsersNonTestsConnections(companyId: string): Promise<Array<ConnectionEntity>>;

  freezeConnections(connectionsIds: Array<string>): Promise<void>;

  unFreezeConnections(connectionsIds: Array<string>): Promise<void>;
}
