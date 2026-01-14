import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GlobalDatabaseContext } from '../../../common/application/global-database-context.js';
import { BaseType, UseCaseType } from '../../../common/data-injection.tokens.js';
import { AuthMiddleware } from '../../../authorization/auth.middleware.js';
import { UserEntity } from '../../user/user.entity.js';
import { LogOutEntity } from '../../log-out/log-out.entity.js';
import { DashboardController } from './dashboards.controller.js';
import { CreateDashboardUseCase } from './use-cases/create-dashboard.use.case.js';
import { UpdateDashboardUseCase } from './use-cases/update-dashboard.use.case.js';
import { FindDashboardUseCase } from './use-cases/find-dashboard.use.case.js';
import { FindAllDashboardsUseCase } from './use-cases/find-all-dashboards.use.case.js';
import { DeleteDashboardUseCase } from './use-cases/delete-dashboard.use.case.js';

@Module({
	imports: [TypeOrmModule.forFeature([UserEntity, LogOutEntity])],
	providers: [
		{
			provide: BaseType.GLOBAL_DB_CONTEXT,
			useClass: GlobalDatabaseContext,
		},
		{
			provide: UseCaseType.CREATE_DASHBOARD,
			useClass: CreateDashboardUseCase,
		},
		{
			provide: UseCaseType.UPDATE_DASHBOARD,
			useClass: UpdateDashboardUseCase,
		},
		{
			provide: UseCaseType.FIND_DASHBOARD,
			useClass: FindDashboardUseCase,
		},
		{
			provide: UseCaseType.FIND_ALL_DASHBOARDS,
			useClass: FindAllDashboardsUseCase,
		},
		{
			provide: UseCaseType.DELETE_DASHBOARD,
			useClass: DeleteDashboardUseCase,
		},
	],
	controllers: [DashboardController],
	exports: [],
})
export class DashboardModule {
	public configure(consumer: MiddlewareConsumer): void {
		consumer
			.apply(AuthMiddleware)
			.forRoutes(
				{ path: '/dashboards/:connectionId', method: RequestMethod.GET },
				{ path: '/dashboards/:connectionId', method: RequestMethod.POST },
				{ path: '/dashboard/:dashboardId/:connectionId', method: RequestMethod.GET },
				{ path: '/dashboard/:dashboardId/:connectionId', method: RequestMethod.PUT },
				{ path: '/dashboard/:dashboardId/:connectionId', method: RequestMethod.DELETE },
			);
	}
}
