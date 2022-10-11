import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthMiddleware } from '../../authorization';
import { GlobalDatabaseContext } from '../../common/application/global-database-context';
import { BaseType, UseCaseType } from '../../common/data-injection.tokens';
import { AgentModule } from '../agent/agent.module';
import { ConnectionPropertiesEntity } from '../connection-properties/connection-properties.entity';
import { ConnectionEntity } from '../connection/connection.entity';
import { CustomFieldsEntity } from '../custom-field/custom-fields.entity';
import { GroupEntity } from '../group/group.entity';
import { LogOutEntity } from '../log-out/log-out.entity';
import { PermissionEntity } from '../permission/permission.entity';
import { TableLogsEntity } from '../table-logs/table-logs.entity';
import { UserEntity } from '../user/user.entity';
import { UserModule } from '../user/user.module';
import { TableWidgetEntity } from '../widget/table-widget.entity';
import { TableSettingsController } from './table-settings.controller';
import { TableSettingsEntity } from './table-settings.entity';
import { CreateTableSettingsUseCase } from './use-cases/create-table-settings.use.case';
import { DeleteTableSettingsUseCase } from './use-cases/delete-table-settings.use.case';
import { FindTableSettingsUseCase } from './use-cases/find-table-settings.use.case';
import { UpdateTableSettingsUseCase } from './use-cases/update-table-settings.use.case';

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
