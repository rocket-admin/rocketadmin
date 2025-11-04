import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthMiddleware } from '../../../authorization/index.js';
import { GlobalDatabaseContext } from '../../../common/application/global-database-context.js';
import { BaseType, UseCaseType } from '../../../common/data-injection.tokens.js';
import { AgentModule } from '../../agent/agent.module.js';
import { ConnectionPropertiesEntity } from '../../connection-properties/connection-properties.entity.js';
import { ConnectionEntity } from '../../connection/connection.entity.js';
import { CustomFieldsEntity } from '../../custom-field/custom-fields.entity.js';
import { GroupEntity } from '../../group/group.entity.js';
import { LogOutEntity } from '../../log-out/log-out.entity.js';
import { PermissionEntity } from '../../permission/permission.entity.js';
import { TableLogsEntity } from '../../table-logs/table-logs.entity.js';
import { UserEntity } from '../../user/user.entity.js';
import { UserModule } from '../../user/user.module.js';
import { TableWidgetEntity } from '../../widget/table-widget.entity.js';
import { TableSettingsController } from './table-settings.controller.js';
import { TableSettingsEntity } from './table-settings.entity.js';
import { CreateTableSettingsUseCase } from './use-cases/create-table-settings.use.case.js';
import { DeleteTableSettingsUseCase } from './use-cases/delete-table-settings.use.case.js';
import { FindTableSettingsUseCase } from './use-cases/find-table-settings.use.case.js';
import { UpdateTableSettingsUseCase } from './use-cases/update-table-settings.use.case.js';

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
    UserModule,
  ],
  providers: [
    {
      provide: BaseType.GLOBAL_DB_CONTEXT,
      useClass: GlobalDatabaseContext,
    },
    {
      provide: UseCaseType.FIND_TABLE_SETTINGS,
      useClass: FindTableSettingsUseCase,
    },
    {
      provide: UseCaseType.CREATE_TABLE_SETTINGS,
      useClass: CreateTableSettingsUseCase,
    },
    {
      provide: UseCaseType.UPDATE_TABLE_SETTINGS,
      useClass: UpdateTableSettingsUseCase,
    },
    {
      provide: UseCaseType.DELETE_TABLE_SETTINGS,
      useClass: DeleteTableSettingsUseCase,
    },
  ],
  controllers: [TableSettingsController],
  exports: [],
})
export class TableSettingsModule {
  public configure(consumer: MiddlewareConsumer): any {
    consumer
      .apply(AuthMiddleware)
      .forRoutes(
        { path: '/settings/', method: RequestMethod.GET },
        { path: '/settings/', method: RequestMethod.POST },
        { path: '/settings/', method: RequestMethod.PUT },
        { path: '/settings/', method: RequestMethod.DELETE },
      );
  }
}
