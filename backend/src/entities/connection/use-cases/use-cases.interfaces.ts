import { CreateConnectionDs } from '../application/data-structures/create-connection.ds';
import { CreatedConnectionDs } from '../application/data-structures/created-connection.ds';
import { CreateUserDs } from '../../user/application/data-structures/create-user.ds';
import { FindOneConnectionDs } from '../application/data-structures/find-one-connection.ds';
import { FoundConnectionsDs } from '../application/data-structures/found-connections.ds';
import { FoundOneConnectionDs } from '../application/data-structures/found-one-connection.ds';
import { FoundUserDs } from '../../user/application/data-structures/found-user.ds';
import { UpdateConnectionDs } from '../application/data-structures/update-connection.ds';
import { DeleteConnectionDs } from '../application/data-structures/delete-connection.ds';
import { DeleteGroupInConnectionDs } from '../application/data-structures/delete-group-in-connection.ds';
import { GroupEntity } from '../../group/group.entity';
import { CreateGroupInConnectionDs } from '../application/data-structures/create-group-in-connection.ds';
import { GetGroupsInConnectionDs } from '../application/data-structures/get-groups-in-connection.ds';
import { FoundUserGroupsInConnectionDs } from '../application/data-structures/found-user-groups-in-connection.ds';
import { GetPermissionsInConnectionDs } from '../application/data-structures/get-permissions-in-connection.ds';
import { FoundPermissionsInConnectionDs } from '../application/data-structures/found-permissions-in-connection.ds';
import { TestConnectionResultDs } from '../application/data-structures/test-connection-result.ds';
import { UpdateMasterPasswordDs } from '../application/data-structures/update-master-password.ds';
import { RestoredConnectionDs } from '../application/data-structures/restored-connection.ds';
import { TokenDs } from '../application/data-structures/token.ds';
import { InTransactionEnum } from '../../../enums';

export interface IFindConnections {
  execute(user: CreateUserDs, inTransaction: InTransactionEnum): Promise<FoundConnectionsDs>;
}

export interface IFindUsersInConnection {
  execute(connectionId: string, inTransaction: InTransactionEnum): Promise<Array<FoundUserDs>>;
}

export interface IFindOneConnection {
  execute(inputData: FindOneConnectionDs, inTransaction: InTransactionEnum): Promise<FoundOneConnectionDs>;
}

export interface ICreateConnection {
  execute(inputData: CreateConnectionDs, inTransaction: InTransactionEnum): Promise<CreatedConnectionDs>;
}

export interface IUpdateConnection {
  execute(inputData: UpdateConnectionDs, inTransaction: InTransactionEnum): Promise<Omit<CreatedConnectionDs, 'groups'>>;
}

export interface IDeleteConnection {
  execute(inputData: DeleteConnectionDs, inTransaction: InTransactionEnum): Promise<CreatedConnectionDs>;
}

export interface IDeleteGroupInConnection {
  execute(inputData: DeleteGroupInConnectionDs, inTransaction: InTransactionEnum): Promise<Omit<GroupEntity, 'connection'>>;
}

export interface ICreateGroupInConnection {
  execute(inputData: CreateGroupInConnectionDs, inTransaction: InTransactionEnum): Promise<Omit<GroupEntity, 'connection'>>;
}

export interface IGetUserGroupsInConnection {
  execute(inputData: GetGroupsInConnectionDs, inTransaction: InTransactionEnum): Promise<Array<FoundUserGroupsInConnectionDs>>;
}

export interface IGetPermissionsForGroupInConnection {
  execute(inputData: GetPermissionsInConnectionDs, inTransaction: InTransactionEnum): Promise<FoundPermissionsInConnectionDs>;
}

export interface ITestConnection {
  execute(inputData: UpdateConnectionDs, inTransaction: InTransactionEnum): Promise<TestConnectionResultDs>;
}

export interface IUpdateMasterPassword {
  execute(inputData: UpdateMasterPasswordDs, inTransaction: InTransactionEnum): Promise<boolean>;
}

export interface IRestoreConnection {
  execute(inputData: UpdateConnectionDs, inTransaction: InTransactionEnum): Promise<RestoredConnectionDs>;
}

export interface IValidateConnectionToken {
  execute(token: string, inTransaction: InTransactionEnum): Promise<boolean>;
}

export interface IRefreshConnectionAgentToken {
  execute(connectionId: string, inTransaction: InTransactionEnum): Promise<TokenDs>;
}
