import { MiddlewareConsumer, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SaaSAuthMiddleware } from '../../authorization/saas-auth.middleware.js';
import { GlobalDatabaseContext } from '../../common/application/global-database-context.js';
import { BaseType, UseCaseType } from '../../common/data-injection.tokens.js';
import { AgentModule } from '../../entities/agent/agent.module.js';
import { CompanyInfoEntity } from '../../entities/company-info/company-info.entity.js';
import { ConnectionEntity } from '../../entities/connection/connection.entity.js';
import { ConnectionModule } from '../../entities/connection/connection.module.js';
import { ConnectionPropertiesEntity } from '../../entities/connection-properties/connection-properties.entity.js';
import { CustomFieldsEntity } from '../../entities/custom-field/custom-fields.entity.js';
import { GroupEntity } from '../../entities/group/group.entity.js';
import { LogOutEntity } from '../../entities/log-out/log-out.entity.js';
import { SecretAccessLogEntity } from '../../entities/secret-access-log/secret-access-log.entity.js';
import { PureCreateRowInTableUseCase } from '../../entities/table/table-pure-crud-operations/use-cases/pure-create-row-in-table.use.case.js';
import { PureDeleteRowFromTableUseCase } from '../../entities/table/table-pure-crud-operations/use-cases/pure-delete-row-from-table.use.case.js';
import { PureGetRowsFromTableUseCase } from '../../entities/table/table-pure-crud-operations/use-cases/pure-get-rows-from-table.use.case.js';
import { PureReadRowFromTableUseCase } from '../../entities/table/table-pure-crud-operations/use-cases/pure-read-row-from-table.use.case.js';
import { PureUpdateRowInTableUseCase } from '../../entities/table/table-pure-crud-operations/use-cases/pure-update-row-in-table.use.case.js';
import { TableLogsEntity } from '../../entities/table-logs/table-logs.entity.js';
import { TableSettingsEntity } from '../../entities/table-settings/common-table-settings/table-settings.entity.js';
import { UserEntity } from '../../entities/user/user.entity.js';
import { UserModule } from '../../entities/user/user.module.js';
import { UserSecretEntity } from '../../entities/user-secret/user-secret.entity.js';
import { TableWidgetEntity } from '../../entities/widget/table-widget.entity.js';
import { SitenovaEndUserAuthGuard } from './guards/sitenova-enduser-auth.guard.js';
import { SitenovaPublicReadGuard } from './guards/sitenova-public-read.guard.js';
import { SitenovaEndUserAuthService } from './services/sitenova-enduser-auth.service.js';
import { SitenovaInternalController } from './sitenova-internal.controller.js';
import { SitenovaSiteController } from './sitenova-site.controller.js';
import { SitenovaExecuteRawQueryUseCase } from './use-cases/sitenova-execute-raw-query.use.case.js';
import { SitenovaLoginEndUserUseCase } from './use-cases/sitenova-login-enduser.use.case.js';
import { SitenovaRegisterEndUserUseCase } from './use-cases/sitenova-register-enduser.use.case.js';

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
			UserSecretEntity,
			CompanyInfoEntity,
			SecretAccessLogEntity,
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
		SitenovaEndUserAuthService,
		SitenovaEndUserAuthGuard,
		SitenovaPublicReadGuard,
		{
			provide: UseCaseType.SITENOVA_EXECUTE_RAW_QUERY,
			useClass: SitenovaExecuteRawQueryUseCase,
		},
		{
			provide: UseCaseType.SITENOVA_REGISTER_ENDUSER,
			useClass: SitenovaRegisterEndUserUseCase,
		},
		{
			provide: UseCaseType.SITENOVA_LOGIN_ENDUSER,
			useClass: SitenovaLoginEndUserUseCase,
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
	controllers: [SitenovaInternalController, SitenovaSiteController],
})
export class SitenovaModule {
	public configure(consumer: MiddlewareConsumer): void {
		consumer.apply(SaaSAuthMiddleware).forRoutes(SitenovaInternalController);
	}
}
