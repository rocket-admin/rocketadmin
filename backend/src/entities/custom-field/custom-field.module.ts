import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthMiddleware } from '../../authorization/index.js';
import { GlobalDatabaseContext } from '../../common/application/global-database-context.js';
import { BaseType, UseCaseType } from '../../common/data-injection.tokens.js';
import { AgentModule } from '../agent/agent.module.js';
import { ConnectionPropertiesEntity } from '../connection-properties/connection-properties.entity.js';
import { ConnectionEntity } from '../connection/connection.entity.js';
import { GroupEntity } from '../group/group.entity.js';
import { LogOutEntity } from '../log-out/log-out.entity.js';
import { PermissionEntity } from '../permission/permission.entity.js';
import { TableLogsEntity } from '../table-logs/table-logs.entity.js';
import { TableSettingsEntity } from '../table-settings/common-table-settings/table-settings.entity.js';
import { UserEntity } from '../user/user.entity.js';
import { UserModule } from '../user/user.module.js';
import { TableWidgetEntity } from '../widget/table-widget.entity.js';
import { CustomFieldController } from './custom-field.controller.js';
import { CustomFieldsEntity } from './custom-fields.entity.js';
import { CreateCustomFieldsUseCase } from './use-cases/create-custom-fields.use.case.js';
import { DeleteCustomFieldUseCase } from './use-cases/delete-custom-field.use.case.js';
import { GetCustomFieldsUseCase } from './use-cases/get-custom-fields.use.case.js';
import { UpdateCustomFieldUseCase } from './use-cases/update-custom-field.use.case.js';

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
      provide: UseCaseType.GET_CUSTOM_FIELDS,
      useClass: GetCustomFieldsUseCase,
    },
    {
      provide: UseCaseType.CREATE_CUSTOM_FIELDS,
      useClass: CreateCustomFieldsUseCase,
    },
    {
      provide: UseCaseType.UPDATE_CUSTOM_FIELDS,
      useClass: UpdateCustomFieldUseCase,
    },
    {
      provide: UseCaseType.DELETE_CUSTOM_FIELD,
      useClass: DeleteCustomFieldUseCase,
    },
  ],
  controllers: [CustomFieldController],
  exports: [],
})
export class CustomFieldModule {
  public configure(consumer: MiddlewareConsumer): any {
    consumer
      .apply(AuthMiddleware)
      .forRoutes(
        { path: '/fields/:connectionId', method: RequestMethod.GET },
        { path: '/field/:connectionId', method: RequestMethod.POST },
        { path: '/field/:connectionId', method: RequestMethod.PUT },
        { path: '/field/:connectionId', method: RequestMethod.DELETE },
      );
  }
}
