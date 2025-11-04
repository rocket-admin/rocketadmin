import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthMiddleware } from '../../authorization/index.js';
import { GlobalDatabaseContext } from '../../common/application/global-database-context.js';
import { BaseType, UseCaseType } from '../../common/data-injection.tokens.js';
import { AgentModule } from '../agent/agent.module.js';
import { AmplitudeModule } from '../amplitude/amplitude.module.js';
import { ConnectionPropertiesEntity } from '../connection-properties/connection-properties.entity.js';
import { CustomFieldsEntity } from '../custom-field/custom-fields.entity.js';
import { GroupEntity } from '../group/group.entity.js';
import { LogOutEntity } from '../log-out/log-out.entity.js';
import { PermissionEntity } from '../permission/permission.entity.js';
import { TableLogsEntity } from '../table-logs/table-logs.entity.js';
import { TableSettingsEntity } from '../table-settings/common-table-settings/table-settings.entity.js';
import { UserEntity } from '../user/user.entity.js';
import { UserModule } from '../user/user.module.js';
import { TableWidgetEntity } from '../widget/table-widget.entity.js';
import { ConnectionController } from './connection.controller.js';
import { ConnectionEntity } from './connection.entity.js';
import { CreateConnectionUseCase } from './use-cases/create-connection.use.case.js';
import { CreateGroupInConnectionUseCase } from './use-cases/create-group-in-connection.use.case.js';
import { DeleteConnectionUseCase } from './use-cases/delete-connection.use.case.js';
import { DeleteGroupFromConnectionUseCase } from './use-cases/delete-group-from-connection.use.case.js';
import { FindAllConnectionsUseCase } from './use-cases/find-all-connections.use.case.js';
import { FindAllUsersInConnectionUseCase } from './use-cases/find-all-users-in-connection.use.case.js';
import { FindOneConnectionUseCase } from './use-cases/find-one-connection.use.case.js';
import { GetPermissionsForGroupInConnectionUseCase } from './use-cases/get-permissions-for-group-in-connection.use.case.js';
import { GetUserGroupsInConnectionUseCase } from './use-cases/get-user-groups-in-connection.use.case.js';
import { GetUserPermissionsForGroupInConnectionUseCase } from './use-cases/get-user-permissions-for-group-in-connection.use.case.js';
import { RefreshConnectionAgentTokenUseCase } from './use-cases/refresh-connection-agent-token.use.case.js';
import { RestoreConnectionUseCase } from './use-cases/restore-connection-use.case.js';
import { TestConnectionUseCase } from './use-cases/test-connection.use.case.js';
import { UpdateConnectionMasterPasswordUseCase } from './use-cases/update-connection-master-password.use.case.js';
import { UpdateConnectionUseCase } from './use-cases/update-connection.use.case.js';
import { ValidateConnectionTokenUseCase } from './use-cases/validate-connection-token.use.case.js';
import { ValidateConnectionMasterPasswordUseCase } from './use-cases/validate-connection-master-password.use.case.js';
import { AuthWithApiMiddleware } from '../../authorization/auth-with-api.middleware.js';
import { UnfreezeConnectionUseCase } from './use-cases/unfreeze-connection.use.case.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ConnectionEntity,
      UserEntity,
      GroupEntity,
      PermissionEntity,
      TableSettingsEntity,
      TableLogsEntity,
      CustomFieldsEntity,
      TableWidgetEntity,
      ConnectionPropertiesEntity,
      LogOutEntity,
    ]),
    UserModule,
    AgentModule,
    AmplitudeModule,
  ],
  providers: [
    {
      provide: BaseType.GLOBAL_DB_CONTEXT,
      useClass: GlobalDatabaseContext,
    },
    {
      provide: UseCaseType.FIND_CONNECTIONS,
      useClass: FindAllConnectionsUseCase,
    },
    {
      provide: UseCaseType.FIND_CONNECTION,
      useClass: FindOneConnectionUseCase,
    },
    {
      provide: UseCaseType.FIND_USERS_IN_CONNECTION,
      useClass: FindAllUsersInConnectionUseCase,
    },
    {
      provide: UseCaseType.CREATE_CONNECTION,
      useClass: CreateConnectionUseCase,
    },
    {
      provide: UseCaseType.UPDATE_CONNECTION,
      useClass: UpdateConnectionUseCase,
    },
    {
      provide: UseCaseType.DELETE_CONNECTION,
      useClass: DeleteConnectionUseCase,
    },
    {
      provide: UseCaseType.DELETE_GROUP_FROM_CONNECTION,
      useClass: DeleteGroupFromConnectionUseCase,
    },
    {
      provide: UseCaseType.CREATE_GROUP_IN_CONNECTION,
      useClass: CreateGroupInConnectionUseCase,
    },
    {
      provide: UseCaseType.GET_USER_GROUPS_IN_CONNECTION,
      useClass: GetUserGroupsInConnectionUseCase,
    },
    {
      provide: UseCaseType.GET_PERMISSIONS_FOR_GROUP_IN_CONNECTION,
      useClass: GetPermissionsForGroupInConnectionUseCase,
    },
    {
      provide: UseCaseType.GET_USER_PERMISSIONS_FOR_GROUP_IN_CONNECTION,
      useClass: GetUserPermissionsForGroupInConnectionUseCase,
    },
    {
      provide: UseCaseType.TEST_CONNECTION_USE_CASE,
      useClass: TestConnectionUseCase,
    },
    {
      provide: UseCaseType.UPDATE_CONNECTION_MASTER_PASSWORD,
      useClass: UpdateConnectionMasterPasswordUseCase,
    },
    {
      provide: UseCaseType.RESTORE_CONNECTION,
      useClass: RestoreConnectionUseCase,
    },
    {
      provide: UseCaseType.VALIDATE_CONNECTION_TOKEN,
      useClass: ValidateConnectionTokenUseCase,
    },
    {
      provide: UseCaseType.REFRESH_CONNECTION_AGENT_TOKEN,
      useClass: RefreshConnectionAgentTokenUseCase,
    },
    {
      provide: UseCaseType.VALIDATE_CONNECTION_MASTER_PASSWORD,
      useClass: ValidateConnectionMasterPasswordUseCase,
    },
    {
      provide: UseCaseType.UNFREEZE_CONNECTION,
      useClass: UnfreezeConnectionUseCase,
    },
  ],
  controllers: [ConnectionController],
})
export class ConnectionModule implements NestModule {
  public configure(consumer: MiddlewareConsumer): any {
    consumer
      .apply(AuthMiddleware)
      .forRoutes(
        // { path: 'connections', method: RequestMethod.GET },
        { path: 'connections/author', method: RequestMethod.GET },
        { path: 'connection/one/:connectionId', method: RequestMethod.GET },
        { path: '/connection/users/:connectionId', method: RequestMethod.GET },
        { path: 'connection', method: RequestMethod.POST },
        { path: 'connection/:connectionId', method: RequestMethod.PUT },
        { path: 'connection/delete/:connectionId', method: RequestMethod.PUT },
        { path: 'connection/group/:connectionId', method: RequestMethod.PUT },
        { path: '/connection/group/delete/:connectionId', method: RequestMethod.PUT },
        { path: 'connection/group/:connectionId', method: RequestMethod.POST },
        { path: 'connection/groups/:connectionId', method: RequestMethod.GET },
        { path: '/connection/permissions/', method: RequestMethod.GET },
        { path: '/connection/user/permissions', method: RequestMethod.GET },
        { path: '/connection/test', method: RequestMethod.POST },
        { path: '/connection/encryption/update/:connectionId', method: RequestMethod.PUT },
        { path: '/connection/encryption/restore/:connectionId', method: RequestMethod.PUT },
        { path: '/connection/token/refresh/:connectionId', method: RequestMethod.GET },
        { path: '/connection/masterpwd/verify/:connectionId', method: RequestMethod.GET },
        { path: '/connection/unfreeze/:connectionId', method: RequestMethod.PUT },
      )
      .apply(AuthWithApiMiddleware)
      .forRoutes({ path: 'connections', method: RequestMethod.GET });
  }
}
