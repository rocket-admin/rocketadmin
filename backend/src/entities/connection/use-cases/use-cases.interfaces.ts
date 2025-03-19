import { CreateConnectionDs } from '../application/data-structures/create-connection.ds.js';
import { CreatedConnectionDTO } from '../application/dto/created-connection.dto.js';
import { CreateUserDs } from '../../user/application/data-structures/create-user.ds.js';
import { FindOneConnectionDs } from '../application/data-structures/find-one-connection.ds.js';
import { FoundConnectionsDs } from '../application/data-structures/found-connections.ds.js';
import { FoundUserDto } from '../../user/dto/found-user.dto.js';
import { UpdateConnectionDs } from '../application/data-structures/update-connection.ds.js';
import { DeleteConnectionDs } from '../application/data-structures/delete-connection.ds.js';
import { DeleteGroupInConnectionDs } from '../application/data-structures/delete-group-in-connection.ds.js';
import { CreateGroupInConnectionDs } from '../application/data-structures/create-group-in-connection.ds.js';
import { GetGroupsInConnectionDs } from '../application/data-structures/get-groups-in-connection.ds.js';
import { GetPermissionsInConnectionDs } from '../application/data-structures/get-permissions-in-connection.ds.js';
import { FoundPermissionsInConnectionDs } from '../application/data-structures/found-permissions-in-connection.ds.js';
import { TestConnectionResultDs } from '../application/data-structures/test-connection-result.ds.js';
import { UpdateMasterPasswordDs } from '../application/data-structures/update-master-password.ds.js';
import { RestoredConnectionDs } from '../application/data-structures/restored-connection.ds.js';
import { TokenDs } from '../application/data-structures/token.ds.js';
import { InTransactionEnum } from '../../../enums/index.js';
import { FoundOneConnectionDs } from '../application/data-structures/found-one-connection.ds.js';
import { FoundGroupResponseDto } from '../../group/dto/found-group-response.dto.js';
import { FoundUserGroupsInConnectionDTO } from '../application/dto/found-user-groups-in-connection.dto.js';
import { SuccessResponse } from '../../../microservices/saas-microservice/data-structures/common-responce.ds.js';
import { TokenValidationResult } from './validate-connection-token.use.case.js';
import { ValidateConnectionMasterPasswordDs } from '../application/data-structures/validate-connection-master-password.ds.js';
import { ValidationResultRo } from '../application/dto/validation-result.ro.js';
import { UnfreezeConnectionDs } from '../application/data-structures/unfreeze-connection.ds.js';

export interface IFindConnections {
  execute(user: CreateUserDs, inTransaction: InTransactionEnum): Promise<FoundConnectionsDs>;
}

export interface IFindUsersInConnection {
  execute(connectionId: string, inTransaction: InTransactionEnum): Promise<Array<FoundUserDto>>;
}

export interface IFindOneConnection {
  execute(inputData: FindOneConnectionDs, inTransaction: InTransactionEnum): Promise<FoundOneConnectionDs>;
}

export interface ICreateConnection {
  execute(inputData: CreateConnectionDs, inTransaction: InTransactionEnum): Promise<CreatedConnectionDTO>;
}

export interface IUpdateConnection {
  execute(
    inputData: UpdateConnectionDs,
    inTransaction: InTransactionEnum,
  ): Promise<Omit<CreatedConnectionDTO, 'groups'>>;
}

export interface IDeleteConnection {
  execute(inputData: DeleteConnectionDs, inTransaction: InTransactionEnum): Promise<CreatedConnectionDTO>;
}

export interface IDeleteGroupInConnection {
  execute(inputData: DeleteGroupInConnectionDs, inTransaction: InTransactionEnum): Promise<FoundGroupResponseDto>;
}

export interface ICreateGroupInConnection {
  execute(inputData: CreateGroupInConnectionDs, inTransaction: InTransactionEnum): Promise<FoundGroupResponseDto>;
}

export interface IGetUserGroupsInConnection {
  execute(
    inputData: GetGroupsInConnectionDs,
    inTransaction: InTransactionEnum,
  ): Promise<Array<FoundUserGroupsInConnectionDTO>>;
}

export interface IGetPermissionsForGroupInConnection {
  execute(
    inputData: GetPermissionsInConnectionDs,
    inTransaction: InTransactionEnum,
  ): Promise<FoundPermissionsInConnectionDs>;
}

export interface ITestConnection {
  execute(inputData: UpdateConnectionDs, inTransaction: InTransactionEnum): Promise<TestConnectionResultDs>;
}

export interface IUpdateMasterPassword {
  execute(inputData: UpdateMasterPasswordDs, inTransaction: InTransactionEnum): Promise<SuccessResponse>;
}

export interface IRestoreConnection {
  execute(inputData: UpdateConnectionDs, inTransaction: InTransactionEnum): Promise<RestoredConnectionDs>;
}

export interface IValidateConnectionToken {
  execute(token: string, inTransaction: InTransactionEnum): Promise<TokenValidationResult>;
}

export interface IRefreshConnectionAgentToken {
  execute(connectionId: string, inTransaction: InTransactionEnum): Promise<TokenDs>;
}

export interface IValidateConnectionMasterPassword {
  execute(inputData: ValidateConnectionMasterPasswordDs, inTransaction: InTransactionEnum): Promise<ValidationResultRo>;
}

export interface IUnfreezeConnection {
  execute(inputData: UnfreezeConnectionDs, inTransaction: InTransactionEnum): Promise<SuccessResponse>;
}
