import { AgentModule } from '../agent/agent.module';
import { AuthMiddleware } from '../../authorization';
import { ConnectionController } from './connection.controller';
import { ConnectionEntity } from './connection.entity';
import { CustomFieldsEntity } from '../custom-field/custom-fields.entity';
import { GroupEntity } from '../group/group.entity';
import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { PermissionEntity } from '../permission/permission.entity';
import { TableLogsEntity } from '../table-logs/table-logs.entity';
import { TableSettingsEntity } from '../table-settings/table-settings.entity';
import { TableWidgetEntity } from '../widget/table-widget.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../user/user.entity';
import { UserModule } from '../user/user.module';
import { ConnectionPropertiesEntity } from '../connection-properties/connection-properties.entity';
import { BaseType, UseCaseType } from '../../common/data-injection.tokens';
import { GlobalDatabaseContext } from '../../common/application/global-database-context';
import { FindAllConnectionsUseCase } from './use-cases/find-all-connections.use.case';
import { FindOneConnectionUseCase } from './use-cases/find-one-connection.use.case';
import { FindAllUsersInConnectionUseCase } from './use-cases/find-all-users-in-connection.use.case';
import { CreateConnectionUseCase } from './use-cases/create-connection.use.case';
import { UpdateConnectionUseCase } from './use-cases/update-connection.use.case';
import { DeleteConnectionUseCase } from './use-cases/delete-connection.use.case';
import { DeleteGroupFromConnectionUseCase } from './use-cases/delete-group-from-connection.use.case';
import { CreateGroupInConnectionUseCase } from './use-cases/create-group-in-connection.use.case';
import { GetUserGroupsInConnectionUseCase } from './use-cases/get-user-groups-in-connection.use.case';
import { GetPermissionsForGroupInConnectionUseCase } from './use-cases/get-permissions-for-group-in-connection.use.case';
import { GetUserPermissionsForGroupInConnectionUseCase } from './use-cases/get-user-permissions-for-group-in-connection.use.case';
import { TestConnectionUseCase } from './use-cases/test-connection.use.case';
import { UpdateConnectionMasterPasswordUseCase } from './use-cases/update-connection-master-password.use.case';
import { AmplitudeModule } from '../amplitude/amplitude.module';
import { RestoreConnectionUseCase } from './use-cases/restore-connection-use.case';
import { ValidateConnectionTokenUseCase } from './use-cases/validate-connection-token.use.case';
import { RefreshConnectionAgentTokenUseCase } from './use-cases/refresh-connection-agent-token.use.case';

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
  ],
  controllers: [ConnectionController],
})
export class ConnectionModule implements NestModule {
  public configure(consumer: MiddlewareConsumer): any {
    consumer
      .apply(AuthMiddleware)
      .forRoutes(
        { path: 'connections', method: RequestMethod.GET },
        { path: 'connections/author', method: RequestMethod.GET },
        { path: 'connection/one/:slug', method: RequestMethod.GET },
        { path: '/connection/users/:slug', method: RequestMethod.GET },
        { path: 'connection', method: RequestMethod.POST },
        { path: 'connection/:slug', method: RequestMethod.PUT },
        { path: 'connection/delete/:slug', method: RequestMethod.PUT },
        { path: 'connection/group/:slug', method: RequestMethod.PUT },
        { path: '/connection/group/delete/:slug', method: RequestMethod.PUT },
        { path: 'connection/group/:slug', method: RequestMethod.POST },
        { path: 'connection/groups/:slug', method: RequestMethod.GET },
        { path: '/connection/permissions/', method: RequestMethod.GET },
        { path: '/connection/user/permissions', method: RequestMethod.GET },
        { path: '/connection/test', method: RequestMethod.POST },
        { path: '/connection/encryption/update/:slug', method: RequestMethod.PUT },
        { path: '/connection/encryption/restore/:slug', method: RequestMethod.PUT },
        { path: '/connection/token/refresh/:slug', method: RequestMethod.GET },
      );
  }
}
