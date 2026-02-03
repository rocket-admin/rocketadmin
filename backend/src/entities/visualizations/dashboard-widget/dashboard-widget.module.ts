import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GlobalDatabaseContext } from '../../../common/application/global-database-context.js';
import { BaseType, UseCaseType } from '../../../common/data-injection.tokens.js';
import { AuthMiddleware } from '../../../authorization/auth.middleware.js';
import { UserEntity } from '../../user/user.entity.js';
import { LogOutEntity } from '../../log-out/log-out.entity.js';
import { DashboardWidgetController } from './dashboard-widgets.controller.js';
import { CreateDashboardWidgetUseCase } from './use-cases/create-dashboard-widget.use.case.js';
import { UpdateDashboardWidgetUseCase } from './use-cases/update-dashboard-widget.use.case.js';
import { DeleteDashboardWidgetUseCase } from './use-cases/delete-dashboard-widget.use.case.js';

@Module({
	imports: [TypeOrmModule.forFeature([UserEntity, LogOutEntity])],
	providers: [
		{
			provide: BaseType.GLOBAL_DB_CONTEXT,
			useClass: GlobalDatabaseContext,
		},
		{
			provide: UseCaseType.CREATE_DASHBOARD_WIDGET,
			useClass: CreateDashboardWidgetUseCase,
		},
		{
			provide: UseCaseType.UPDATE_DASHBOARD_WIDGET,
			useClass: UpdateDashboardWidgetUseCase,
		},
		{
			provide: UseCaseType.DELETE_DASHBOARD_WIDGET,
			useClass: DeleteDashboardWidgetUseCase,
		},
	],
	controllers: [DashboardWidgetController],
	exports: [],
})
export class DashboardWidgetModule {
	public configure(consumer: MiddlewareConsumer): void {
		consumer
			.apply(AuthMiddleware)
			.forRoutes(
				{ path: '/dashboard/:dashboardId/widget/:connectionId', method: RequestMethod.POST },
				{ path: '/dashboard/:dashboardId/widget/:widgetId/:connectionId', method: RequestMethod.PUT },
				{ path: '/dashboard/:dashboardId/widget/:widgetId/:connectionId', method: RequestMethod.DELETE },
			);
	}
}
