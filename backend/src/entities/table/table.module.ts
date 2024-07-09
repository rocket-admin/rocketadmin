import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GlobalDatabaseContext } from '../../common/application/global-database-context.js';
import { BaseType, UseCaseType } from '../../common/data-injection.tokens.js';
import { AgentModule } from '../agent/agent.module.js';
import { ConnectionPropertiesEntity } from '../connection-properties/connection-properties.entity.js';
import { ConnectionEntity } from '../connection/connection.entity.js';
import { ConnectionModule } from '../connection/connection.module.js';
import { CustomFieldsEntity } from '../custom-field/custom-fields.entity.js';
import { GroupEntity } from '../group/group.entity.js';
import { LogOutEntity } from '../log-out/log-out.entity.js';
import { PermissionEntity } from '../permission/permission.entity.js';
import { TableLogsEntity } from '../table-logs/table-logs.entity.js';
import { TableSettingsEntity } from '../table-settings/table-settings.entity.js';
import { UserEntity } from '../user/user.entity.js';
import { UserModule } from '../user/user.module.js';
import { TableWidgetEntity } from '../widget/table-widget.entity.js';
import { TableController } from './table.controller.js';
import { AddRowInTableUseCase } from './use-cases/add-row-in-table.use.case.js';
import { DeleteRowFromTableUseCase } from './use-cases/delete-row-from-table.use.case.js';
import { DeleteRowsFromTableUseCase } from './use-cases/delete-rows-from-table.use.case.js';
import { FindTablesInConnectionUseCase } from './use-cases/find-tables-in-connection.use.case.js';
import { GetRowByPrimaryKeyUseCase } from './use-cases/get-row-by-primary-key.use.case.js';
import { GetTableRowsUseCase } from './use-cases/get-table-rows.use.case.js';
import { GetTableStructureUseCase } from './use-cases/get-table-structure.use.case.js';
import { UpdateRowInTableUseCase } from './use-cases/update-row-in-table.use.case.js';
import { ExportCSVFromTableUseCase } from './use-cases/export-csv-from-table.use.case.js';
import { BulkUpdateRowsInTableUseCase } from './use-cases/bulk-update-rows-in-table.use.case.js';
import { ImportCSVInTableUseCase } from './use-cases/import-csv-in-table-user.case.js';
import { AuthWithApiMiddleware } from '../../authorization/auth-with-api.middleware.js';

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
    ConnectionModule,
    UserModule,
  ],
  providers: [
    {
      provide: BaseType.GLOBAL_DB_CONTEXT,
      useClass: GlobalDatabaseContext,
    },
    {
      provide: UseCaseType.FIND_TABLES_IN_CONNECTION,
      useClass: FindTablesInConnectionUseCase,
    },
    {
      provide: UseCaseType.GET_ALL_TABLE_ROWS,
      useClass: GetTableRowsUseCase,
    },
    {
      provide: UseCaseType.GET_TABLE_STRUCTURE,
      useClass: GetTableStructureUseCase,
    },
    {
      provide: UseCaseType.ADD_ROW_IN_TABLE,
      useClass: AddRowInTableUseCase,
    },
    {
      provide: UseCaseType.UPDATE_ROW_IN_TABLE,
      useClass: UpdateRowInTableUseCase,
    },
    {
      provide: UseCaseType.DELETE_ROW_FROM_TABLE,
      useClass: DeleteRowFromTableUseCase,
    },
    {
      provide: UseCaseType.DELETE_ROWS_FROM_TABLE,
      useClass: DeleteRowsFromTableUseCase,
    },
    {
      provide: UseCaseType.GET_ROW_BY_PRIMARY_KEY,
      useClass: GetRowByPrimaryKeyUseCase,
    },
    {
      provide: UseCaseType.EXPORT_CSV_FROM_TABLE,
      useClass: ExportCSVFromTableUseCase,
    },
    {
      provide: UseCaseType.BULK_UPDATE_ROWS_IN_TABLE,
      useClass: BulkUpdateRowsInTableUseCase,
    },
    {
      provide: UseCaseType.IMPORT_CSV_TO_TABLE,
      useClass: ImportCSVInTableUseCase,
    },
  ],
  controllers: [TableController],
})
export class TableModule {
  public configure(consumer: MiddlewareConsumer): any {
    consumer
      .apply(AuthWithApiMiddleware)
      .forRoutes(
        { path: '/table/columns/:connectionId', method: RequestMethod.GET },
        { path: '/table/rows/:connectionId', method: RequestMethod.GET },
        { path: '/table/:connectionId', method: RequestMethod.GET },
        { path: '/connection/tables/:connectionId', method: RequestMethod.GET },
        { path: '/table/rows/:connectionId', method: RequestMethod.GET },
        { path: '/table/rows/find/:connectionId', method: RequestMethod.POST },
        { path: '/table/structure/:connectionId', method: RequestMethod.GET },
        { path: '/table/row/:connectionId', method: RequestMethod.POST },
        { path: '/table/row/:connectionId', method: RequestMethod.PUT },
        { path: '/table/row/:connectionId', method: RequestMethod.DELETE },
        { path: '/table/rows/delete/:connectionId', method: RequestMethod.PUT },
        { path: '/table/rows/update/:connectionId', method: RequestMethod.PUT },
        { path: '/table/row/:connectionId', method: RequestMethod.GET },
        { path: '/table/csv/export/:connectionId', method: RequestMethod.POST },
        { path: '/table/csv/import/:connectionId', method: RequestMethod.POST },
      );
  }
}
