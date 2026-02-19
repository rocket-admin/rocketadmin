import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthMiddleware } from '../../../authorization/auth.middleware.js';
import { GlobalDatabaseContext } from '../../../common/application/global-database-context.js';
import { BaseType, UseCaseType } from '../../../common/data-injection.tokens.js';
import { LogOutEntity } from '../../log-out/log-out.entity.js';
import { UserEntity } from '../../user/user.entity.js';
import { SavedDbQueryController } from './panel.controller.js';
import { CreatePanelUseCase } from './use-cases/create-panel.use.case.js';
import { DeleteSavedDbQueryUseCase } from './use-cases/delete-panel.use.case.js';
import { ExecuteSavedDbQueryUseCase } from './use-cases/execute-panel.use.case.js';
import { FindAllSavedDbQueriesUseCase } from './use-cases/find-all-panels.use.case.js';
import { FindSavedDbQueryUseCase } from './use-cases/find-panel.use.case.js';
import { TestDbQueryUseCase } from './use-cases/test-db-query.use.case.js';
import { UpdateSavedDbQueryUseCase } from './use-cases/update-panel.use.case.js';

@Module({
	imports: [TypeOrmModule.forFeature([UserEntity, LogOutEntity])],
	providers: [
		{
			provide: BaseType.GLOBAL_DB_CONTEXT,
			useClass: GlobalDatabaseContext,
		},
		{
			provide: UseCaseType.CREATE_SAVED_DB_QUERY,
			useClass: CreatePanelUseCase,
		},
		{
			provide: UseCaseType.UPDATE_SAVED_DB_QUERY,
			useClass: UpdateSavedDbQueryUseCase,
		},
		{
			provide: UseCaseType.FIND_SAVED_DB_QUERY,
			useClass: FindSavedDbQueryUseCase,
		},
		{
			provide: UseCaseType.FIND_ALL_SAVED_DB_QUERIES,
			useClass: FindAllSavedDbQueriesUseCase,
		},
		{
			provide: UseCaseType.DELETE_SAVED_DB_QUERY,
			useClass: DeleteSavedDbQueryUseCase,
		},
		{
			provide: UseCaseType.EXECUTE_SAVED_DB_QUERY,
			useClass: ExecuteSavedDbQueryUseCase,
		},
		{
			provide: UseCaseType.TEST_DB_QUERY,
			useClass: TestDbQueryUseCase,
		},
	],
	controllers: [SavedDbQueryController],
	exports: [],
})
export class PanelModule {
	public configure(consumer: MiddlewareConsumer): void {
		consumer
			.apply(AuthMiddleware)
			.forRoutes(
				{ path: '/connection/:connectionId/saved-queries', method: RequestMethod.GET },
				{ path: '/connection/:connectionId/saved-query/:queryId', method: RequestMethod.GET },
				{ path: '/connection/:connectionId/saved-query', method: RequestMethod.POST },
				{ path: '/connection/:connectionId/saved-query/:queryId', method: RequestMethod.PUT },
				{ path: '/connection/:connectionId/saved-query/:queryId', method: RequestMethod.DELETE },
				{ path: '/connection/:connectionId/saved-query/:queryId/execute', method: RequestMethod.POST },
				{ path: '/connection/:connectionId/query/test', method: RequestMethod.POST },
				// New panel routes
				{ path: '/connection/:connectionId/panels', method: RequestMethod.GET },
				{ path: '/connection/:connectionId/panel/:panelId', method: RequestMethod.GET },
				{ path: '/connection/:connectionId/panel', method: RequestMethod.POST },
				{ path: '/connection/:connectionId/panel/:panelId', method: RequestMethod.PUT },
				{ path: '/connection/:connectionId/panel/:panelId', method: RequestMethod.DELETE },
				{ path: '/connection/:connectionId/panel/:panelId/execute', method: RequestMethod.POST },
			);
	}
}
