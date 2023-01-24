import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthMiddleware } from '../../authorization/index.js';
import { GlobalDatabaseContext } from '../../common/application/global-database-context.js';
import { BaseType, UseCaseType } from '../../common/data-injection.tokens.js';
import { AgentModule } from '../agent/agent.module.js';
import { ConnectionPropertiesEntity } from '../connection-properties/connection-properties.entity.js';
import { ConnectionEntity } from '../connection/connection.entity.js';
import { CustomFieldsEntity } from '../custom-field/custom-fields.entity.js';
import { GroupEntity } from '../group/group.entity.js';
import { GroupModule } from '../group/group.module.js';
import { LogOutEntity } from '../log-out/log-out.entity.js';
import { TableLogsEntity } from '../table-logs/table-logs.entity.js';
import { TableSettingsEntity } from '../table-settings/table-settings.entity.js';
import { UserEntity } from '../user/user.entity.js';
import { TableWidgetEntity } from '../widget/table-widget.entity.js';
import { PermissionController } from './permission.controller.js';
import { PermissionEntity } from './permission.entity.js';
import { CreateOrUpdatePermissionsUseCase } from './use-cases/create-or-update-permissions.use.case.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ConnectionEntity,
      CustomFieldsEntity,
      GroupEntity,
      PermissionEntity,
      TableLogsEntity,
      TableSettingsEntity,
      TableWidgetEntity,
      UserEntity,
      ConnectionPropertiesEntity,
      LogOutEntity,
    ]),
    AgentModule,
    GroupModule,
  ],
  providers: [
    {
      provide: BaseType.GLOBAL_DB_CONTEXT,
      useClass: GlobalDatabaseContext,
    },
    {
      provide: UseCaseType.CREATE_OR_UPDATE_PERMISSIONS,
      useClass: CreateOrUpdatePermissionsUseCase,
    },
  ],
  controllers: [PermissionController],
  exports: [],
})
export class PermissionModule implements NestModule {
  public configure(consumer: MiddlewareConsumer): any {
    consumer
      .apply(AuthMiddleware)
      .forRoutes(
        { path: 'permissions/all', method: RequestMethod.GET },
        { path: 'permission/:slug', method: RequestMethod.POST },
        { path: 'permission/group/:slug', method: RequestMethod.POST },
        { path: 'permission/group/:slug', method: RequestMethod.PUT },
        { path: 'permissions/:slug', method: RequestMethod.POST },
        { path: 'permissions/:slug', method: RequestMethod.PUT },
      );
  }
}
