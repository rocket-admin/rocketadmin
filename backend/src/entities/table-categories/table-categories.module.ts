import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthMiddleware } from '../../authorization/auth.middleware.js';
import { GlobalDatabaseContext } from '../../common/application/global-database-context.js';
import { BaseType, UseCaseType } from '../../common/data-injection.tokens.js';
import { LogOutEntity } from '../log-out/log-out.entity.js';
import { UserEntity } from '../user/user.entity.js';
import { TableCategoriesController } from './table-categories.controller.js';
import { CreateOrUpdateTableCategoriesUseCase } from './use-cases/create-or-update-table-categories.use.case.js';
import { FindTableCategoriesUseCase } from './use-cases/find-table-categories.use.case.js';
import { FindTableCategoriesWithTablesUseCase } from './use-cases/find-table-categories-with-tables.use.case.js';

@Module({
	imports: [TypeOrmModule.forFeature([UserEntity, LogOutEntity])],
	providers: [
		{
			provide: BaseType.GLOBAL_DB_CONTEXT,
			useClass: GlobalDatabaseContext,
		},
		{
			provide: UseCaseType.FIND_TABLE_CATEGORIES,
			useClass: FindTableCategoriesUseCase,
		},
		{
			provide: UseCaseType.CREATE_UPDATE_TABLE_CATEGORIES,
			useClass: CreateOrUpdateTableCategoriesUseCase,
		},
		{
			provide: UseCaseType.FIND_TABLE_CATEGORIES_WITH_TABLES,
			useClass: FindTableCategoriesWithTablesUseCase,
		},
	],
	controllers: [TableCategoriesController],
})
export class TableCategoriesModule {
	public configure(consumer: MiddlewareConsumer): any {
		consumer
			.apply(AuthMiddleware)
			.forRoutes(
				{ path: '/table-categories/:connectionId/', method: RequestMethod.GET },
				{ path: '/table-categories/:connectionId/', method: RequestMethod.PUT },
				{ path: '/table-categories/v2/:connectionId/', method: RequestMethod.GET },
			);
	}
}
