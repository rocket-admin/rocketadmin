import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthMiddleware } from '../../authorization';
import { GlobalDatabaseContext } from '../../common/application/global-database-context';
import { BaseType, UseCaseType } from '../../common/data-injection.tokens';
import { AgentModule } from '../agent/agent.module';
import { ConnectionPropertiesEntity } from '../connection-properties/connection-properties.entity';
import { ConnectionEntity } from '../connection/connection.entity';
import { CustomFieldsEntity } from '../custom-field/custom-fields.entity';
import { GroupEntity } from '../group/group.entity';
import { GroupModule } from '../group/group.module';
import { LogOutEntity } from '../log-out/log-out.entity';
import { TableLogsEntity } from '../table-logs/table-logs.entity';
import { TableSettingsEntity } from '../table-settings/table-settings.entity';
import { UserEntity } from '../user/user.entity';
import { TableWidgetEntity } from '../widget/table-widget.entity';
import { PermissionController } from './permission.controller';
import { PermissionEntity } from './permission.entity';
import { CreateOrUpdatePermissionsUseCase } from './use-cases/create-or-update-permissions.use.case';

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
