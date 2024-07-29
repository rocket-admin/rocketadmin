import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Injectable,
  Post,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import validator from 'validator';
import { IGlobalDatabaseContext } from '../../common/application/global-database-context.interface.js';
import { BaseType, UseCaseType } from '../../common/data-injection.tokens.js';
import { BodyUuid, GCLlId, MasterPassword, QueryUuid, SlugUuid, UserId } from '../../decorators/index.js';
import { AmplitudeEventTypeEnum, InTransactionEnum } from '../../enums/index.js';
import { Messages } from '../../exceptions/text/messages.js';
import { processExceptionMessage } from '../../exceptions/utils/process-exception-message.js';
import { ConnectionEditGuard, ConnectionReadGuard } from '../../guards/index.js';
import {
  isConnectionEntityAgent,
  isConnectionTypeAgent,
  slackPostMessage,
  toPrettyErrorsMsg,
} from '../../helpers/index.js';
import { SentryInterceptor } from '../../interceptors/index.js';
import { AmplitudeService } from '../amplitude/amplitude.service.js';
import { IComplexPermission } from '../permission/permission.interface.js';
import { FindUserDs } from '../user/application/data-structures/find-user.ds.js';
import { FoundUserDto } from '../user/dto/found-user.dto.js';
import { CreateConnectionDs } from './application/data-structures/create-connection.ds.js';
import { CreateGroupInConnectionDs } from './application/data-structures/create-group-in-connection.ds.js';
import { CreatedConnectionDTO } from './application/dto/created-connection.dto.js';
import { DeleteConnectionDs } from './application/data-structures/delete-connection.ds.js';
import { DeleteGroupInConnectionDs } from './application/data-structures/delete-group-in-connection.ds.js';
import { FindOneConnectionDs } from './application/data-structures/find-one-connection.ds.js';
import { FoundConnectionsDs } from './application/data-structures/found-connections.ds.js';
import { GetGroupsInConnectionDs } from './application/data-structures/get-groups-in-connection.ds.js';
import { GetPermissionsInConnectionDs } from './application/data-structures/get-permissions-in-connection.ds.js';
import { RestoredConnectionDs } from './application/data-structures/restored-connection.ds.js';
import { UpdateConnectionDs } from './application/data-structures/update-connection.ds.js';
import { UpdateMasterPasswordDs } from './application/data-structures/update-master-password.ds.js';

import {
  ICreateConnection,
  ICreateGroupInConnection,
  IDeleteConnection,
  IDeleteGroupInConnection,
  IFindConnections,
  IFindOneConnection,
  IFindUsersInConnection,
  IGetPermissionsForGroupInConnection,
  IGetUserGroupsInConnection,
  IRefreshConnectionAgentToken,
  IRestoreConnection,
  ITestConnection,
  IUpdateConnection,
  IUpdateMasterPassword,
  IValidateConnectionToken,
} from './use-cases/use-cases.interfaces.js';
import { isTestConnectionUtil } from './utils/is-test-connection-util.js';
import { TestConnectionResultDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/test-result-connection.ds.js';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/enums/connection-types-enum.js';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateConnectionDto } from './application/dto/index.js';
import { UpdatedConnectionResponseDTO } from './application/dto/updated-connection-responce.dto.js';
import { DeleteConnectionReasonDto } from './application/dto/delete-connection.dto.js';
import { DeleteGroupFromConnectionDTO } from './application/dto/delete-group-from-connection-request.dto.js';
import { CreateGroupInConnectionDTO } from './application/dto/create-group-in-connection.dto.js';
import { FoundPermissionsInConnectionDs } from './application/data-structures/found-permissions-in-connection.ds.js';
import { TestConnectionResponseDTO } from './application/dto/test-connection-response.dto.js';
import { ConnectionTokenResponseDTO } from './application/dto/new-connection-token-response.dto.js';
import { UpdateMasterPasswordRequestBodyDto } from './application/dto/update-master-password-request-body.dto.js';
import { FoundOneConnectionDs } from './application/data-structures/found-one-connection.ds.js';
import { FoundGroupResponseDto } from '../group/dto/found-group-response.dto.js';
import { FoundUserGroupsInConnectionDTO } from './application/dto/found-user-groups-in-connection.dto.js';

@UseInterceptors(SentryInterceptor)
@Controller()
@ApiBearerAuth()
@ApiTags('connection')
@Injectable()
export class ConnectionController {
  constructor(
    @Inject(UseCaseType.FIND_CONNECTIONS)
    private readonly findConnectionsUseCase: IFindConnections,
    @Inject(UseCaseType.FIND_CONNECTION)
    private readonly findOneConnectionUseCase: IFindOneConnection,
    @Inject(UseCaseType.FIND_USERS_IN_CONNECTION)
    private readonly findAllUsersInConnectionUseCase: IFindUsersInConnection,
    @Inject(UseCaseType.CREATE_CONNECTION)
    private readonly createConnectionUseCase: ICreateConnection,
    @Inject(UseCaseType.UPDATE_CONNECTION)
    private readonly updateConnectionUseCase: IUpdateConnection,
    @Inject(UseCaseType.DELETE_CONNECTION)
    private readonly deleteConnectionUseCase: IDeleteConnection,
    @Inject(UseCaseType.DELETE_GROUP_FROM_CONNECTION)
    private readonly deleteGroupInConnectionUseCase: IDeleteGroupInConnection,
    @Inject(UseCaseType.CREATE_GROUP_IN_CONNECTION)
    private readonly createGroupInConnectionUseCase: ICreateGroupInConnection,
    @Inject(UseCaseType.GET_USER_GROUPS_IN_CONNECTION)
    private readonly getUserGroupsInConnectionUseCase: IGetUserGroupsInConnection,
    @Inject(UseCaseType.GET_PERMISSIONS_FOR_GROUP_IN_CONNECTION)
    private readonly getPermissionsForGroupInConnectionUseCase: IGetPermissionsForGroupInConnection,
    @Inject(UseCaseType.GET_USER_PERMISSIONS_FOR_GROUP_IN_CONNECTION)
    private readonly getUserPermissionsForGroupInConnectionUseCase: IGetPermissionsForGroupInConnection,
    @Inject(UseCaseType.TEST_CONNECTION_USE_CASE)
    private readonly testConnectionUseCase: ITestConnection,
    @Inject(UseCaseType.UPDATE_CONNECTION_MASTER_PASSWORD)
    private readonly updateConnectionMasterPasswordUseCase: IUpdateMasterPassword,
    @Inject(UseCaseType.RESTORE_CONNECTION)
    private readonly restoreConnectionUseCase: IRestoreConnection,
    @Inject(UseCaseType.VALIDATE_CONNECTION_TOKEN)
    private readonly validateConnectionTokenUseCase: IValidateConnectionToken,
    @Inject(UseCaseType.REFRESH_CONNECTION_AGENT_TOKEN)
    private readonly refreshConnectionAgentTokenUseCase: IRefreshConnectionAgentToken,
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private readonly amplitudeService: AmplitudeService,
  ) {}

  @ApiOperation({ summary: 'Get all connections where user have access' })
  @ApiResponse({
    status: 200,
    type: FoundConnectionsDs,
  })
  @Get('/connections')
  async findAll(@UserId() userId: string, @GCLlId() glidCookieValue: string): Promise<FoundConnectionsDs> {
    console.log(`findAll triggered in connection.controller ->: ${new Date().toISOString()}`);
    const userData: FindUserDs = {
      id: userId,
      gclidValue: glidCookieValue,
    };
    return await this.findConnectionsUseCase.execute(userData, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Get all users in connection' })
  @ApiResponse({
    status: 200,
    type: Array<FoundUserDto>,
  })
  @UseGuards(ConnectionReadGuard)
  @Get('/connection/users/:connectionId')
  async findAllUsers(
    @UserId() userId: string,
    @SlugUuid('connectionId') connectionId: string,
  ): Promise<Array<FoundUserDto>> {
    try {
      return await this.findAllUsersInConnectionUseCase.execute(connectionId, InTransactionEnum.OFF);
    } catch (e) {
      throw e;
    } finally {
      const isConnectionTest = await this._dbContext.connectionRepository.isTestConnectionById(connectionId);
      await this.amplitudeService.formAndSendLogRecord(
        isConnectionTest
          ? AmplitudeEventTypeEnum.connectionUsersReceivedTest
          : AmplitudeEventTypeEnum.connectionUsersReceived,
        userId,
      );
    }
  }

  @ApiOperation({ summary: 'One connection by id' })
  @ApiResponse({
    status: 200,
    type: FoundOneConnectionDs,
  })
  @Get('/connection/one/:connectionId')
  async findOne(
    @SlugUuid('connectionId') connectionId: string,
    @MasterPassword() masterPwd: string,
    @UserId() userId: string,
  ): Promise<FoundOneConnectionDs> {
    let foundConnection: FoundOneConnectionDs = null;
    try {
      const findOneConnectionInput: FindOneConnectionDs = {
        connectionId: connectionId,
        masterPwd: masterPwd,
        cognitoUserName: userId,
      };
      foundConnection = await this.findOneConnectionUseCase.execute(findOneConnectionInput, InTransactionEnum.OFF);
      return foundConnection;
    } catch (e) {
      throw e;
    } finally {
      if (foundConnection?.connection) {
        const isTest = await this._dbContext.connectionRepository.isTestConnectionById(connectionId);
        await this.amplitudeService.formAndSendLogRecord(
          isTest ? AmplitudeEventTypeEnum.connectionReceivedTest : AmplitudeEventTypeEnum.connectionReceived,
          userId,
        );
      }
    }
  }

  @ApiOperation({ summary: 'Create connection' })
  @ApiBody({ type: CreateConnectionDto })
  @ApiResponse({
    status: 201,
    description: 'Connection was created.',
    type: CreatedConnectionDTO,
  })
  @Post('/connection')
  async create(
    @Body() createConnectionDto: CreateConnectionDto,
    @UserId() userId: string,
    @MasterPassword() masterPwd: string,
  ): Promise<CreatedConnectionDTO> {
    if (!createConnectionDto.password && !isConnectionTypeAgent(createConnectionDto.type)) {
      throw new BadRequestException(Messages.PASSWORD_MISSING);
    }
    if (createConnectionDto.masterEncryption && !masterPwd) {
      throw new BadRequestException(Messages.MASTER_PASSWORD_REQUIRED);
    }
    if (createConnectionDto.ssh && !createConnectionDto.privateSSHKey) {
      throw new BadRequestException(Messages.SSH_PASSWORD_MISSING);
    }
    const createConnectionDs: CreateConnectionDs = {
      connection_parameters: {
        azure_encryption: createConnectionDto.azure_encryption,
        cert: createConnectionDto.cert,
        database: createConnectionDto.database,
        host: createConnectionDto.host,
        masterEncryption: createConnectionDto.masterEncryption,
        password: createConnectionDto.password,
        port: createConnectionDto.port,
        privateSSHKey: createConnectionDto.privateSSHKey,
        schema: createConnectionDto.schema,
        sid: createConnectionDto.sid,
        ssh: createConnectionDto.ssh,
        sshHost: createConnectionDto.sshHost,
        sshPort: createConnectionDto.sshPort,
        sshUsername: createConnectionDto.sshUsername,
        ssl: createConnectionDto.ssl,
        title: createConnectionDto.title,
        type: createConnectionDto.type,
        username: createConnectionDto.username,
        authSource: createConnectionDto.authSource,
      },
      creation_info: {
        authorId: userId,
        masterPwd: masterPwd,
      },
    };
    return await this.createConnectionUseCase.execute(createConnectionDs, InTransactionEnum.ON);
  }

  @ApiOperation({ summary: 'Updated connection' })
  @ApiBody({ type: CreateConnectionDto })
  @ApiResponse({
    status: 200,
    description: 'Connection was updated.',
    type: UpdatedConnectionResponseDTO,
  })
  @UseGuards(ConnectionEditGuard)
  @Put('/connection/:connectionId')
  async update(
    @Body() updateConnectionDto: CreateConnectionDto,
    @SlugUuid('connectionId') connectionId: string,
    @UserId() userId: string,
    @MasterPassword() masterPwd: string,
  ): Promise<UpdatedConnectionResponseDTO> {
    const errors = [];
    if (updateConnectionDto.masterEncryption && !masterPwd) {
      errors.push(Messages.MASTER_PASSWORD_REQUIRED);
    }
    if (errors.length > 0) {
      throw new BadRequestException(toPrettyErrorsMsg(errors));
    }
    const connectionData: UpdateConnectionDs = {
      connection_parameters: {
        azure_encryption: updateConnectionDto.azure_encryption,
        cert: updateConnectionDto.cert,
        database: updateConnectionDto.database,
        host: updateConnectionDto.host,
        masterEncryption: updateConnectionDto.masterEncryption,
        password: updateConnectionDto.password,
        port: updateConnectionDto.port,
        privateSSHKey: updateConnectionDto.privateSSHKey,
        schema: updateConnectionDto.schema,
        sid: updateConnectionDto.sid,
        ssh: updateConnectionDto.ssh,
        sshHost: updateConnectionDto.sshHost,
        sshPort: updateConnectionDto.sshPort,
        sshUsername: updateConnectionDto.sshUsername,
        ssl: updateConnectionDto.ssl,
        title: updateConnectionDto.title,
        type: updateConnectionDto.type,
        username: updateConnectionDto.username,
        authSource: updateConnectionDto.authSource,
      },
      update_info: {
        authorId: userId,
        connectionId: connectionId,
        masterPwd: masterPwd,
      },
    };

    const updatedConnection = await this.updateConnectionUseCase.execute(connectionData, InTransactionEnum.ON);
    return { connection: updatedConnection };
  }

  @ApiOperation({ summary: 'Delete connection' })
  @ApiBody({ type: DeleteConnectionReasonDto })
  @ApiResponse({
    status: 200,
    description: 'Connection was deleted.',
    type: CreatedConnectionDTO,
  })
  @UseGuards(ConnectionEditGuard)
  @Put('/connection/delete/:connectionId')
  async delete(
    @Body() reasonData: DeleteConnectionReasonDto,
    @UserId() userId: string,
    @SlugUuid('connectionId') connectionId: string,
    @MasterPassword() masterPwd: string,
  ): Promise<CreatedConnectionDTO> {
    const inputData: DeleteConnectionDs = {
      connectionId: connectionId,
      cognitoUserName: userId,
      masterPwd: masterPwd,
    };
    const deleteResult = await this.deleteConnectionUseCase.execute(inputData, InTransactionEnum.ON);
    const isTest = isTestConnectionUtil(deleteResult);
    if (!isTest) {
      const userEmail = await this._dbContext.userRepository.getUserEmailOrReturnNull(userId);
      const slackMessage = Messages.USER_DELETED_CONNECTION(userEmail, reasonData.reason, reasonData.message);
      await slackPostMessage(slackMessage);
    }
    await this.amplitudeService.formAndSendLogRecord(
      isTest ? AmplitudeEventTypeEnum.connectionDeletedTest : AmplitudeEventTypeEnum.connectionDeleted,
      inputData.cognitoUserName,
      {
        reason: reasonData.reason,
        message: reasonData.message,
      },
    );
    return deleteResult;
  }

  @ApiOperation({ summary: 'Delete group from connection' })
  @ApiBody({ type: DeleteGroupFromConnectionDTO })
  @ApiResponse({
    status: 200,
    description: 'Group was removed from connection.',
    type: FoundGroupResponseDto,
  })
  @UseGuards(ConnectionEditGuard)
  @Put('/connection/group/delete/:connectionId')
  async deleteGroupFromConnection(
    @BodyUuid('groupId') groupId: string,
    @SlugUuid('connectionId') connectionId: string,
    @UserId() userId: string,
  ): Promise<FoundGroupResponseDto> {
    if (!groupId) {
      throw new BadRequestException(Messages.GROUP_ID_MISSING);
    }
    const inputData: DeleteGroupInConnectionDs = {
      groupId: groupId,
      connectionId: connectionId,
      cognitoUserName: userId,
    };
    return await this.deleteGroupInConnectionUseCase.execute(inputData, InTransactionEnum.ON);
  }

  @ApiOperation({ summary: 'Create group in connection' })
  @ApiBody({ type: CreateGroupInConnectionDTO })
  @ApiResponse({
    status: 201,
    description: 'Group was created.',
    type: FoundGroupResponseDto,
  })
  @UseGuards(ConnectionEditGuard)
  @Post('/connection/group/:connectionId')
  async createGroupInConnection(
    @Body() groupData: CreateGroupInConnectionDTO,
    @SlugUuid('connectionId') connectionId: string,
    @UserId() userId: string,
  ): Promise<FoundGroupResponseDto> {
    const { title } = groupData;
    if (!title) {
      throw new BadRequestException(Messages.GROUP_TITLE_MISSING);
    }
    const inputData: CreateGroupInConnectionDs = {
      group_parameters: {
        title: title,
        connectionId: connectionId,
      },
      creation_info: {
        cognitoUserName: userId,
      },
    };
    return await this.createGroupInConnectionUseCase.execute(inputData, InTransactionEnum.ON);
  }

  @ApiOperation({ summary: 'Get all groups in connection' })
  @ApiResponse({
    status: 200,
    type: FoundUserGroupsInConnectionDTO,
    isArray: true,
  })
  @Get('/connection/groups/:connectionId')
  async getGroupsInConnection(
    @UserId() userId: string,
    @SlugUuid('connectionId') connectionId: string,
  ): Promise<Array<FoundUserGroupsInConnectionDTO>> {
    if (!connectionId) {
      throw new BadRequestException(Messages.ID_MISSING);
    }
    const inputData: GetGroupsInConnectionDs = {
      connectionId: connectionId,
      cognitoUserName: userId,
    };
    return await this.getUserGroupsInConnectionUseCase.execute(inputData, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Get group permissions for connection' })
  @ApiResponse({
    status: 200,
    type: FoundPermissionsInConnectionDs,
  })
  @Get('/connection/permissions')
  async getPermissionsForGroupInConnection(
    @QueryUuid('connectionId') connectionId: string,
    @QueryUuid('groupId') groupId: string,
    @UserId() userId: string,
    @MasterPassword() masterPwd: string,
  ): Promise<IComplexPermission> {
    if (!connectionId || !groupId) {
      throw new BadRequestException(Messages.PARAMETER_MISSING);
    }
    const inputData: GetPermissionsInConnectionDs = {
      groupId: groupId,
      connectionId: connectionId,
      masterPwd: masterPwd,
      cognitoUserName: userId,
    };
    return await this.getPermissionsForGroupInConnectionUseCase.execute(inputData, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Get user permissions for group and connection' })
  @ApiResponse({
    status: 200,
    type: FoundPermissionsInConnectionDs,
  })
  @Get('/connection/user/permissions')
  async getUserPermissionsForGroupInConnection(
    @QueryUuid('connectionId') connectionId: string,
    @QueryUuid('groupId') groupId: string,
    @UserId() userId: string,
    @MasterPassword() masterPwd: string,
  ): Promise<IComplexPermission> {
    if (!connectionId || !groupId) {
      throw new BadRequestException(Messages.PARAMETER_MISSING);
    }
    const inputData: GetPermissionsInConnectionDs = {
      groupId: groupId,
      connectionId: connectionId,
      masterPwd: masterPwd,
      cognitoUserName: userId,
    };
    return await this.getUserPermissionsForGroupInConnectionUseCase.execute(inputData, InTransactionEnum.OFF);
  }
  @ApiOperation({ summary: 'Create connection' })
  @ApiBody({ type: CreateConnectionDto })
  @ApiResponse({
    status: 201,
    type: TestConnectionResponseDTO,
  })
  @Post('/connection/test/')
  async testConnection(
    @Body() testConnectionData: CreateConnectionDto,
    @Query('connectionId') connectionId: string,
    @MasterPassword() masterPwd: string,
    @UserId() userId: string,
  ): Promise<TestConnectionResultDS> {
    const inputData: UpdateConnectionDs = {
      connection_parameters: {
        azure_encryption: testConnectionData.azure_encryption,
        cert: testConnectionData.cert,
        database: testConnectionData.database,
        host: testConnectionData.host,
        masterEncryption: testConnectionData.masterEncryption,
        password: testConnectionData.password,
        port: testConnectionData.port,
        privateSSHKey: testConnectionData.privateSSHKey,
        schema: testConnectionData.schema,
        sid: testConnectionData.sid,
        ssh: testConnectionData.ssh,
        sshHost: testConnectionData.sshHost,
        sshPort: testConnectionData.sshPort,
        sshUsername: testConnectionData.sshUsername,
        ssl: testConnectionData.ssl,
        title: testConnectionData.title,
        type: testConnectionData.type,
        username: testConnectionData.username,
        authSource: testConnectionData.authSource,
      },
      update_info: {
        authorId: userId,
        connectionId: connectionId,
        masterPwd: masterPwd,
      },
    };
    const errors = this.validateParameters(inputData.connection_parameters);
    if (errors.length > 0) {
      return {
        result: false,
        message: toPrettyErrorsMsg(errors),
      };
    }
    const result = await this.testConnectionUseCase.execute(inputData, InTransactionEnum.OFF);
    result.message = processExceptionMessage(result.message);
    return result;
  }

  @ApiOperation({ summary: 'Change connection master password' })
  @ApiBody({ type: UpdateMasterPasswordDs })
  @ApiResponse({
    status: 200,
  })
  @UseGuards(ConnectionEditGuard)
  @Put('/connection/encryption/update/:connectionId')
  async updateConnectionMasterPwd(
    @SlugUuid('connectionId') connectionId: string,
    @Body() passwordData: UpdateMasterPasswordRequestBodyDto,
  ): Promise<boolean> {
    if (!connectionId) {
      throw new BadRequestException(Messages.CONNECTION_ID_MISSING);
    }
    const { oldMasterPwd, newMasterPwd } = passwordData;

    if (!oldMasterPwd) {
      throw new BadRequestException(Messages.MASTED_OLD_PASSWORD_MISSING);
    }
    if (!newMasterPwd) {
      throw new BadRequestException(Messages.MASTED_NEW_PASSWORD_MISSING);
    }
    const inputData: UpdateMasterPasswordDs = {
      connectionId: connectionId,
      newMasterPwd: newMasterPwd,
      oldMasterPwd: oldMasterPwd,
    };
    return await this.updateConnectionMasterPasswordUseCase.execute(inputData, InTransactionEnum.ON);
  }

  @ApiOperation({ summary: 'Restore connection encrypted with master password' })
  @ApiBody({ type: CreateConnectionDto })
  @ApiResponse({
    status: 201,
    description: 'Connection was created.',
    type: RestoredConnectionDs,
  })
  @UseGuards(ConnectionEditGuard)
  @Put('/connection/encryption/restore/:connectionId')
  async restore(
    @Body() restoreConnectionData: CreateConnectionDto,
    @SlugUuid('connectionId') connectionId: string,
    @UserId() userId: string,
    @MasterPassword() masterPwd: string,
  ): Promise<RestoredConnectionDs> {
    const connectionData: UpdateConnectionDs = {
      connection_parameters: {
        title: restoreConnectionData.title,
        masterEncryption: restoreConnectionData.masterEncryption,
        type: restoreConnectionData.type,
        host: restoreConnectionData.host,
        port: restoreConnectionData.port,
        username: restoreConnectionData.username,
        password: restoreConnectionData.password,
        database: restoreConnectionData.database,
        schema: restoreConnectionData.schema,
        sid: restoreConnectionData.sid,
        ssh: restoreConnectionData.ssh,
        privateSSHKey: restoreConnectionData.privateSSHKey,
        sshHost: restoreConnectionData.sshHost,
        sshPort: restoreConnectionData.sshPort,
        sshUsername: restoreConnectionData.sshUsername,
        ssl: restoreConnectionData.ssl,
        cert: restoreConnectionData.cert,
        azure_encryption: restoreConnectionData.azure_encryption,
        authSource: restoreConnectionData.authSource,
      },
      update_info: {
        connectionId: connectionId,
        masterPwd: masterPwd,
        authorId: userId,
      },
    };

    const errors = this.validateParameters(connectionData.connection_parameters);

    if (!connectionId) errors.push(Messages.ID_MISSING);

    if (connectionData.connection_parameters.masterEncryption && !masterPwd) {
      errors.push(Messages.MASTER_PASSWORD_REQUIRED);
    }

    if (errors.length > 0) {
      throw new BadRequestException(toPrettyErrorsMsg(errors));
    }
    return await this.restoreConnectionUseCase.execute(connectionData, InTransactionEnum.ON);
  }

  @ApiOperation({ summary: 'Check if connection agent token is valid' })
  @ApiResponse({
    status: 200,
    description: 'Connection token is valid.',
    type: Boolean,
  })
  @Get('/connection/token/')
  async validateConnectionAgentToken(@Query('token') token: string): Promise<boolean> {
    if (!token || typeof token !== 'string' || token.length === 0) {
      return false;
    }
    return await this.validateConnectionTokenUseCase.execute(token, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Generate new connection token' })
  @ApiResponse({
    status: 200,
    description: 'New connection token was generated.',
    type: ConnectionTokenResponseDTO,
  })
  @UseGuards(ConnectionEditGuard)
  @Get('/connection/token/refresh/:connectionId')
  async refreshConnectionAgentToken(@SlugUuid('connectionId') connectionId: string): Promise<{ token: string }> {
    if (!connectionId) {
      throw new BadRequestException(Messages.CONNECTION_ID_MISSING);
    }
    return await this.refreshConnectionAgentTokenUseCase.execute(connectionId, InTransactionEnum.ON);
  }

  private validateParameters = (connectionData: CreateConnectionDto): Array<string> => {
    const errors = [];

    function validateConnectionType(type: string): string {
      return Object.keys(ConnectionTypesEnum).find((key) => key === type);
    }

    if (!connectionData.type) errors.push(Messages.TYPE_MISSING);
    if (!validateConnectionType(connectionData.type)) errors.push(Messages.CONNECTION_TYPE_INVALID);
    if (!isConnectionEntityAgent(connectionData)) {
      if (!connectionData.host) {
        errors.push(Messages.HOST_MISSING);
        return errors;
      }
      if (process.env.NODE_ENV !== 'test' && !connectionData.ssh) {
        if (!this.isMongoHost(connectionData.host)) {
          if (!validator.isFQDN(connectionData.host) && !validator.isIP(connectionData.host))
            errors.push(Messages.HOST_NAME_INVALID);
        }
      }
      if (connectionData.port < 0 || connectionData.port > 65535 || !connectionData.port)
        errors.push(Messages.PORT_MISSING);
      if (typeof connectionData.port !== 'number') errors.push(Messages.PORT_FORMAT_INCORRECT);
      if (!connectionData.username) errors.push(Messages.USERNAME_MISSING);
      if (!connectionData.database) errors.push(Messages.DATABASE_MISSING);
      if (typeof connectionData.ssh !== 'boolean') errors.push(Messages.SSH_FORMAT_INCORRECT);
      if (connectionData.ssh) {
        if (typeof connectionData.sshPort !== 'number') {
          errors.push(Messages.SSH_PORT_FORMAT_INCORRECT);
        }
        if (!connectionData.sshPort) errors.push(Messages.SSH_PORT_MISSING);
        if (!connectionData.sshUsername) errors.push(Messages.SSH_USERNAME_MISSING);
        if (!connectionData.sshHost) errors.push(Messages.SSH_HOST_MISSING);
      }
    } else {
      if (!connectionData.title) errors.push('Connection title missing');
    }

    return errors;
  };

  private isMongoHost(host: string): boolean {
    return host.startsWith('mongodb+srv');
  }
}
