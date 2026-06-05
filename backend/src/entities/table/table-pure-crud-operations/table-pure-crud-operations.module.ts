import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthWithApiMiddleware } from '../../../authorization/auth-with-api.middleware.js';
import { GlobalDatabaseContext } from '../../../common/application/global-database-context.js';
import { BaseType, UseCaseType } from '../../../common/data-injection.tokens.js';
import { AgentModule } from '../../agent/agent.module.js';
import { ConnectionEntity } from '../../connection/connection.entity.js';
import { ConnectionModule } from '../../connection/connection.module.js';
import { ConnectionPropertiesEntity } from '../../connection-properties/connection-properties.entity.js';
import { CustomFieldsEntity } from '../../custom-field/custom-fields.entity.js';
import { GroupEntity } from '../../group/group.entity.js';
import { LogOutEntity } from '../../log-out/log-out.entity.js';
import { TableLogsEntity } from '../../table-logs/table-logs.entity.js';
import { TableSettingsEntity } from '../../table-settings/common-table-settings/table-settings.entity.js';
import { UserEntity } from '../../user/user.entity.js';
import { UserModule } from '../../user/user.module.js';
import { TableWidgetEntity } from '../../widget/table-widget.entity.js';
import { TablePureCrudOperationsController } from './table-pure-crud-operations.controller.js';
import { PureCreateRowInTableUseCase } from './use-cases/pure-create-row-in-table.use.case.js';
import { PureDeleteRowFromTableUseCase } from './use-cases/pure-delete-row-from-table.use.case.js';
import { PureGetRowsFromTableUseCase } from './use-cases/pure-get-rows-from-table.use.case.js';
import { PureReadRowFromTableUseCase } from './use-cases/pure-read-row-from-table.use.case.js';
import { PureUpdateRowInTableUseCase } from './use-cases/pure-update-row-in-table.use.case.js';

@Module({
	imports: [
		TypeOrmModule.forFeature([
			ConnectionEntity,
			CustomFieldsEntity,
			GroupEntity,
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
			provide: UseCaseType.PURE_CREATE_ROW_IN_TABLE,
			useClass: PureCreateRowInTableUseCase,
		},
		{
			provide: UseCaseType.PURE_READ_ROW_FROM_TABLE,
			useClass: PureReadRowFromTableUseCase,
		},
		{
			provide: UseCaseType.PURE_UPDATE_ROW_IN_TABLE,
			useClass: PureUpdateRowInTableUseCase,
		},
		{
			provide: UseCaseType.PURE_DELETE_ROW_FROM_TABLE,
			useClass: PureDeleteRowFromTableUseCase,
		},
		{
			provide: UseCaseType.PURE_GET_ROWS_FROM_TABLE,
			useClass: PureGetRowsFromTableUseCase,
		},
	],
	controllers: [TablePureCrudOperationsController],
})
export class TablePureCrudOperationsModule {
	public configure(consumer: MiddlewareConsumer): void {
		consumer
			.apply(AuthWithApiMiddleware)
			.forRoutes(
				{ path: '/table/crud/:connectionId', method: RequestMethod.POST },
				{ path: '/table/crud/rows/:connectionId', method: RequestMethod.POST },
				{ path: '/table/crud/:connectionId', method: RequestMethod.GET },
				{ path: '/table/crud/:connectionId', method: RequestMethod.PUT },
				{ path: '/table/crud/:connectionId', method: RequestMethod.DELETE },
			);
	}
}
