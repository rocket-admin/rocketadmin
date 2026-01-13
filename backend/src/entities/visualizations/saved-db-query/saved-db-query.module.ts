import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GlobalDatabaseContext } from '../../../common/application/global-database-context.js';
import { BaseType, UseCaseType } from '../../../common/data-injection.tokens.js';
import { AuthMiddleware } from '../../../authorization/auth.middleware.js';
import { UserEntity } from '../../user/user.entity.js';
import { LogOutEntity } from '../../log-out/log-out.entity.js';
import { SavedDbQueryController } from './saved-db-query.controller.js';
import { CreateSavedDbQueryUseCase } from './use-cases/create-saved-db-query.use.case.js';
import { UpdateSavedDbQueryUseCase } from './use-cases/update-saved-db-query.use.case.js';
import { FindSavedDbQueryUseCase } from './use-cases/find-saved-db-query.use.case.js';
import { FindAllSavedDbQueriesUseCase } from './use-cases/find-all-saved-db-queries.use.case.js';
import { DeleteSavedDbQueryUseCase } from './use-cases/delete-saved-db-query.use.case.js';
import { ExecuteSavedDbQueryUseCase } from './use-cases/execute-saved-db-query.use.case.js';
import { TestDbQueryUseCase } from './use-cases/test-db-query.use.case.js';

@Module({
	imports: [TypeOrmModule.forFeature([UserEntity, LogOutEntity])],
	providers: [
		{
			provide: BaseType.GLOBAL_DB_CONTEXT,
			useClass: GlobalDatabaseContext,
		},
		{
			provide: UseCaseType.CREATE_SAVED_DB_QUERY,
			useClass: CreateSavedDbQueryUseCase,
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
export class SavedDbQueryModule {
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
			);
	}
}
