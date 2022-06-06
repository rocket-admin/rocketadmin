import { AgentModule } from '../agent/agent.module';
import { AuthMiddleware } from '../../authorization';
import { ConnectionEntity } from '../connection/connection.entity';
import { ConnectionModule } from '../connection/connection.module';
import { CustomFieldsEntity } from '../custom-field/custom-fields.entity';
import { GroupEntity } from '../group/group.entity';
import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { PermissionEntity } from '../permission/permission.entity';
import { TableController } from './table.controller';
import { TableLogsEntity } from '../table-logs/table-logs.entity';
import { TableService } from './table.service';
import { TableSettingsEntity } from '../table-settings/table-settings.entity';
import { TableWidgetEntity } from '../widget/table-widget.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../user/user.entity';
import { UserModule } from '../user/user.module';
import { ConnectionPropertiesEntity } from '../connection-properties/connection-properties.entity';
import { BaseType } from '../../common/data-injection.tokens';
import { GlobalDatabaseContext } from '../../common/application/global-database-context';

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
    ConnectionModule,
    UserModule,
  ],
  providers: [
    TableService,
    {
      provide: BaseType.GLOBAL_DB_CONTEXT,
      useClass: GlobalDatabaseContext,
    },
  ],
  controllers: [TableController],
})
export class TableModule {
  public configure(consumer: MiddlewareConsumer): any {
    consumer
      .apply(AuthMiddleware)
      .forRoutes(
        { path: '/table/columns/:slug', method: RequestMethod.GET },
        { path: '/table/rows/:slug', method: RequestMethod.GET },
        { path: '/table/:slug', method: RequestMethod.GET },
        { path: '/connection/tables/:slug', method: RequestMethod.GET },
        { path: '/table/rows/:slug', method: RequestMethod.GET },
        { path: '/table/structure/:slug', method: RequestMethod.GET },
        { path: '/table/row/:slug', method: RequestMethod.POST },
        { path: '/table/row/:slug', method: RequestMethod.PUT },
        { path: '/table/row/:slug', method: RequestMethod.DELETE },
        { path: '/table/row/:slug', method: RequestMethod.GET },
      );
  }
}
