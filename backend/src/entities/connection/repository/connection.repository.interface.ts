import { UserEntity } from '../../user/user.entity.js';
import { ConnectionEntity } from '../connection.entity.js';

export interface IConnectionRepository {
	saveNewConnection(connection: ConnectionEntity): Promise<ConnectionEntity>;

	findAllUserConnections(userId: string, includeTestConnections: boolean): Promise<Array<ConnectionEntity>>;

	findAllUserNonTestsConnections(userId: string): Promise<Array<ConnectionEntity>>;

	findAllUsersInConnection(connectionId: string): Promise<Array<UserEntity>>;

	findOneConnection(connectionId: string): Promise<ConnectionEntity | null>;

	findAndDecryptConnection(connectionId: string, masterPwd: string): Promise<ConnectionEntity | null>;

	removeConnection(connection: ConnectionEntity): Promise<ConnectionEntity>;

	findConnectionWithGroups(connectionId: string): Promise<ConnectionEntity | null>;

	getWorkedConnectionsInTwoWeeks(): Promise<Array<ConnectionEntity>>;

	getConnectionByGroupIdWithCompanyAndUsersInCompany(groupId: string): Promise<ConnectionEntity | null>;

	findOneById(connectionId: string): Promise<ConnectionEntity | null>;

	isTestConnectionById(connectionId: string): Promise<boolean>;

	saveUpdatedConnection(connection: ConnectionEntity): Promise<ConnectionEntity>;

	findOneAgentConnectionByToken(connectionToken: string): Promise<ConnectionEntity | null>;

	decryptConnectionField(field: string): string;

	findAllUserTestConnections(userId: string): Promise<Array<ConnectionEntity>>;

	isUserFromConnection(userId: string, connectionId: string): Promise<boolean>;

	findAllCompanyUsersNonTestsConnections(companyId: string): Promise<Array<ConnectionEntity>>;

	freezeConnections(connectionsIds: Array<string>): Promise<void>;

	unFreezeConnections(connectionsIds: Array<string>): Promise<void>;

	foundUserTestConnectionsWithoutCompany(userId: string): Promise<Array<ConnectionEntity>>;
}
