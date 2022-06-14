import { AgentModule } from '../agent/agent.module';
import { AuthMiddleware } from '../../authorization';
import { ConnectionEntity } from '../connection/connection.entity';
import { GroupController } from './group.controller';
import { GroupEntity } from './group.entity';
import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { PermissionEntity } from '../permission/permission.entity';
import { TableSettingsEntity } from '../table-settings/table-settings.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../user/user.entity';
import { BaseType, UseCaseType } from '../../common/data-injection.tokens';
import { AddUserInGroupUseCase } from './use-cases/add-user-in-group.use.case';
import { GlobalDatabaseContext } from '../../common/application/global-database-context';
import { VerifyAddUserInGroupUseCase } from './use-cases/verify-add-user-in-group.use.case';
import { FindAllUserGroupsUseCase } from './use-cases/find-all-user-groups.use.case';
import { FindAllUsersInGroupUseCase } from './use-cases/find-all-users-in-group.use.case';
import { RemoveUserFromGroupUseCase } from './use-cases/remove-user-from-group.use.case';
import { DeleteGroupUseCase } from './use-cases/delete-group.use.case';

@Module({
  imports: [
    TypeOrmModule.forFeature([ConnectionEntity, GroupEntity, PermissionEntity, UserEntity, TableSettingsEntity]),
    AgentModule,
  ],
  providers: [
    {
      provide: BaseType.GLOBAL_DB_CONTEXT,
      useClass: GlobalDatabaseContext,
    },
    {
      provide: UseCaseType.INVITE_USER_IN_GROUP,
      useClass: AddUserInGroupUseCase,
    },
    {
      provide: UseCaseType.VERIFY_INVITE_USER_IN_GROUP,
      useClass: VerifyAddUserInGroupUseCase,
    },
    {
      provide: UseCaseType.FIND_ALL_USER_GROUPS,
      useClass: FindAllUserGroupsUseCase,
    },
    {
      provide: UseCaseType.FIND_ALL_USERS_IN_GROUP,
      useClass: FindAllUsersInGroupUseCase,
    },
    {
      provide: UseCaseType.REMOVE_USER_FROM_GROUP,
      useClass: RemoveUserFromGroupUseCase,
    },
    {
      provide: UseCaseType.DELETE_GROUP,
      useClass: DeleteGroupUseCase,
    },
  ],
  controllers: [GroupController],
  exports: [],
})
export class GroupModule {
  public configure(consumer: MiddlewareConsumer): any {
    consumer
      .apply(AuthMiddleware)
      .forRoutes(
        { path: 'groups', method: RequestMethod.GET },
        { path: 'group', method: RequestMethod.POST },
        { path: 'group/:slug', method: RequestMethod.DELETE },
        { path: 'group/user', method: RequestMethod.PUT },
        { path: '/group/user/delete', method: RequestMethod.PUT },
        { path: 'group/permissions/:slug', method: RequestMethod.GET },
        { path: 'group/permission', method: RequestMethod.PUT },
        { path: '/group/permission/delete', method: RequestMethod.PUT },
        { path: 'group/delete/:slug', method: RequestMethod.DELETE },
        { path: 'group/users/:slug', method: RequestMethod.GET },
      );
  }
}
