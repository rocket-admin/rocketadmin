import { AgentModule } from '../agent/agent.module';
import { AuthMiddleware } from '../../authorization';
import { ConnectionEntity } from '../connection/connection.entity';
import { CustomFieldController } from './custom-field.controller';
import { CustomFieldsEntity } from './custom-fields.entity';
import { GroupEntity } from '../group/group.entity';
import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { PermissionEntity } from '../permission/permission.entity';
import { TableLogsEntity } from '../table-logs/table-logs.entity';
import { TableService } from '../table/table.service';
import { TableSettingsEntity } from '../table-settings/table-settings.entity';
import { TableWidgetEntity } from '../widget/table-widget.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../user/user.entity';
import { UserModule } from '../user/user.module';
import { ConnectionPropertiesEntity } from '../connection-properties/connection-properties.entity';
import { BaseType, UseCaseType } from '../../common/data-injection.tokens';
import { GlobalDatabaseContext } from '../../common/application/global-database-context';
import { GetCustomFieldsUseCase } from './use-cases/get-custom-fields.use.case';
import { CreateCustomFieldsUseCase } from './use-cases/create-custom-fields.use.case';
import { UpdateCustomFieldUseCase } from './use-cases/update-custom-field.use.case';
import { DeleteCustomFieldUseCase } from './use-cases/delete-custom-field.use.case';

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
    ]),
    AgentModule,
    UserModule,
  ],
  providers: [
    TableService,
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
        { path: '/fields/:slug', method: RequestMethod.GET },
        { path: '/field/:slug', method: RequestMethod.POST },
        { path: '/field/:slug', method: RequestMethod.PUT },
        { path: '/field/:slug', method: RequestMethod.DELETE },
      );
  }
}
