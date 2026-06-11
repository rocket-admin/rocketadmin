import { MiddlewareConsumer, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SaaSAuthMiddleware } from '../../authorization/saas-auth.middleware.js';
import { GlobalDatabaseContext } from '../../common/application/global-database-context.js';
import { BaseType, UseCaseType } from '../../common/data-injection.tokens.js';
import { AgentsController } from './agents.controller.js';
import { ExecuteAiAggregationPipelineUseCase } from './use-cases/execute-ai-aggregation-pipeline.use.case.js';
import { ExecuteAiRawQueryUseCase } from './use-cases/execute-ai-raw-query.use.case.js';
import { GetAiConnectionContextUseCase } from './use-cases/get-ai-connection-context.use.case.js';
import { GetAiTableStructureUseCase } from './use-cases/get-ai-table-structure.use.case.js';
import { ScanAndCreateSettingsUseCase } from './use-cases/scan-and-create-settings.use.case.js';
import { ValidateConnectionEditUseCase } from './use-cases/validate-connection-edit.use.case.js';
import { ValidateTableAiRequestUseCase } from './use-cases/validate-table-ai-request.use.case.js';
import { ValidateUserTokenUseCase } from './use-cases/validate-user-token.use.case.js';

@Module({
	imports: [TypeOrmModule.forFeature([])],
	providers: [
		{
			provide: BaseType.GLOBAL_DB_CONTEXT,
			useClass: GlobalDatabaseContext,
		},
		{
			provide: UseCaseType.AGENTS_VALIDATE_USER_TOKEN,
			useClass: ValidateUserTokenUseCase,
		},
		{
			provide: UseCaseType.AGENTS_VALIDATE_TABLE_AI_REQUEST,
			useClass: ValidateTableAiRequestUseCase,
		},
		{
			provide: UseCaseType.AGENTS_VALIDATE_CONNECTION_EDIT,
			useClass: ValidateConnectionEditUseCase,
		},
		{
			provide: UseCaseType.AGENTS_GET_AI_CONNECTION_CONTEXT,
			useClass: GetAiConnectionContextUseCase,
		},
		{
			provide: UseCaseType.AGENTS_GET_AI_TABLE_STRUCTURE,
			useClass: GetAiTableStructureUseCase,
		},
		{
			provide: UseCaseType.AGENTS_EXECUTE_AI_RAW_QUERY,
			useClass: ExecuteAiRawQueryUseCase,
		},
		{
			provide: UseCaseType.AGENTS_EXECUTE_AI_AGGREGATION_PIPELINE,
			useClass: ExecuteAiAggregationPipelineUseCase,
		},
		{
			provide: UseCaseType.AGENTS_SCAN_AND_CREATE_SETTINGS,
			useClass: ScanAndCreateSettingsUseCase,
		},
	],
	controllers: [AgentsController],
})
export class AgentsModule {
	public configure(consumer: MiddlewareConsumer): void {
		consumer.apply(SaaSAuthMiddleware).forRoutes(AgentsController);
	}
}
