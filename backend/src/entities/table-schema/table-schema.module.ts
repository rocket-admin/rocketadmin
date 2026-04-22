import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthMiddleware } from '../../authorization/auth.middleware.js';
import { GlobalDatabaseContext } from '../../common/application/global-database-context.js';
import { BaseType, UseCaseType } from '../../common/data-injection.tokens.js';
import { ConnectionEntity } from '../connection/connection.entity.js';
import { LogOutEntity } from '../log-out/log-out.entity.js';
import { UserEntity } from '../user/user.entity.js';
import { TableSchemaController } from './table-schema.controller.js';
import { TableSchemaChangeEntity } from './table-schema-change.entity.js';
import { ApproveAndApplySchemaChangeUseCase } from './use-cases/approve-and-apply-schema-change.use-case.js';
import { GenerateSchemaChangeUseCase } from './use-cases/generate-schema-change.use-case.js';
import { GetSchemaChangeUseCase } from './use-cases/get-schema-change.use-case.js';
import { ListSchemaChangesUseCase } from './use-cases/list-schema-changes.use-case.js';
import { RejectSchemaChangeUseCase } from './use-cases/reject-schema-change.use-case.js';
import { RollbackSchemaChangeUseCase } from './use-cases/rollback-schema-change.use-case.js';
import { SchemaChangeOwnershipGuard } from './utils/schema-change-ownership.guard.js';

@Module({
	imports: [TypeOrmModule.forFeature([TableSchemaChangeEntity, ConnectionEntity, UserEntity, LogOutEntity])],
	providers: [
		{
			provide: BaseType.GLOBAL_DB_CONTEXT,
			useClass: GlobalDatabaseContext,
		},
		{
			provide: UseCaseType.GENERATE_SCHEMA_CHANGE,
			useClass: GenerateSchemaChangeUseCase,
		},
		{
			provide: UseCaseType.APPROVE_SCHEMA_CHANGE,
			useClass: ApproveAndApplySchemaChangeUseCase,
		},
		{
			provide: UseCaseType.REJECT_SCHEMA_CHANGE,
			useClass: RejectSchemaChangeUseCase,
		},
		{
			provide: UseCaseType.ROLLBACK_SCHEMA_CHANGE,
			useClass: RollbackSchemaChangeUseCase,
		},
		{
			provide: UseCaseType.LIST_SCHEMA_CHANGES,
			useClass: ListSchemaChangesUseCase,
		},
		{
			provide: UseCaseType.GET_SCHEMA_CHANGE,
			useClass: GetSchemaChangeUseCase,
		},
		SchemaChangeOwnershipGuard,
	],
	controllers: [TableSchemaController],
})
export class TableSchemaModule implements NestModule {
	public configure(consumer: MiddlewareConsumer): void {
		consumer
			.apply(AuthMiddleware)
			.forRoutes(
				{ path: '/table-schema/:connectionId/generate', method: RequestMethod.POST },
				{ path: '/table-schema/:connectionId/changes', method: RequestMethod.GET },
				{ path: '/table-schema/change/:changeId', method: RequestMethod.GET },
				{ path: '/table-schema/change/:changeId/approve', method: RequestMethod.POST },
				{ path: '/table-schema/change/:changeId/reject', method: RequestMethod.POST },
				{ path: '/table-schema/change/:changeId/rollback', method: RequestMethod.POST },
			);
	}
}
