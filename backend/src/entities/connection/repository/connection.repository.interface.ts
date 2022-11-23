import { UserEntity } from '../../user/user.entity';
import { ConnectionEntity } from '../connection.entity';

export interface IConnectionRepository {
  saveNewConnection(connection: ConnectionEntity): Promise<ConnectionEntity>;

  findAllUserConnections(
    userId: string,
  ): Promise<Array<Omit<ConnectionEntity, 'password' | 'privateSSHKey' | 'groups'>>>;

  findAllUserNonTestsConnections(
    userId: string,
  ): Promise<Array<Omit<ConnectionEntity, 'password' | 'privateSSHKey' | 'groups'>>>;

  findAllNonTestsConnectionsWhereUserIsOwner(userId: string): Promise<Array<ConnectionEntity>>;

  findAllUsersInConnection(connectionId): Promise<Array<UserEntity>>;

  findOneConnection(connectionId: string): Promise<Omit<ConnectionEntity, 'password' | 'privateSSHKey' | 'groups'>>;

  getConnectionAuthorIdByGroupInConnectionId(groupId: string): Promise<string>;
  // findFullConnectionEntity(connectionId: string): Promise<ConnectionEntity>;

  findAndDecryptConnection(connectionId: string, masterPwd: string): Promise<ConnectionEntity>;

  removeConnection(connection: ConnectionEntity): Promise<ConnectionEntity>;

  findConnectionWithGroups(
    connectionId: string,
  ): Promise<Omit<ConnectionEntity, 'password' | 'privateSSHKey' | 'cert'>>;

  getConnectionsWithNonNullUsersGCLIDs(): Promise<Array<ConnectionEntity>>;

  getWorkedConnectionsInTwoWeeks(): Promise<Array<ConnectionEntity>>;

  getConnectionByGroupId(groupId: string): Promise<ConnectionEntity>;

  findOneById(connectionId: string): Promise<ConnectionEntity>;

  isTestConnectionById(connectionId: string): Promise<boolean>;

  saveUpdatedConnection(connection: ConnectionEntity): Promise<ConnectionEntity>;

  findOneAgentConnectionByToken(connectionToken: string): Promise<ConnectionEntity>;

  decryptConnectionField(field: string): string;
}
