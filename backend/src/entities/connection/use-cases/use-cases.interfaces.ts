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

export interface IFindConnections {
  execute(user: CreateUserDs): Promise<FoundConnectionsDs>;
}

export interface IFindUsersInConnection {
  execute(connectionId: string): Promise<Array<FoundUserDs>>;
}

export interface IFindOneConnection {
  execute(inputData: FindOneConnectionDs): Promise<FoundOneConnectionDs>;
}

export interface ICreateConnection {
  execute(inputData: CreateConnectionDs): Promise<CreatedConnectionDs>;
}

export interface IUpdateConnection {
  execute(inputData: UpdateConnectionDs): Promise<Omit<CreatedConnectionDs, 'groups'>>;
}

export interface IDeleteConnection {
  execute(inputData: DeleteConnectionDs): Promise<CreatedConnectionDs>;
}

export interface IDeleteGroupInConnection {
  execute(inputData: DeleteGroupInConnectionDs): Promise<Omit<GroupEntity, 'connection'>>;
}

export interface ICreateGroupInConnection {
  execute(inputData: CreateGroupInConnectionDs): Promise<Omit<GroupEntity, 'connection'>>;
}

export interface IGetUserGroupsInConnection {
  execute(inputData: GetGroupsInConnectionDs): Promise<Array<FoundUserGroupsInConnectionDs>>;
}

export interface IGetPermissionsForGroupInConnection {
  execute(inputData: GetPermissionsInConnectionDs): Promise<FoundPermissionsInConnectionDs>;
}

export interface ITestConnection {
  execute(inputData: UpdateConnectionDs): Promise<TestConnectionResultDs>;
}

export interface IUpdateMasterPassword {
  execute(inputData: UpdateMasterPasswordDs): Promise<boolean>;
}
