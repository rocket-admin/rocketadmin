import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AICoreModule } from '../../../ai-core/ai-core.module.js';
import { AuthMiddleware } from '../../../authorization/auth.middleware.js';
import { GlobalDatabaseContext } from '../../../common/application/global-database-context.js';
import { BaseType, UseCaseType } from '../../../common/data-injection.tokens.js';
import { LogOutEntity } from '../../log-out/log-out.entity.js';
import { UserEntity } from '../../user/user.entity.js';
import { DashboardWidgetController } from './panel-position.controller.js';
import { CreatePanelPositionUseCase } from './use-cases/create-panel-position.use.case.js';
import { DeletePanelPositionUseCase } from './use-cases/delete-panel-position.use.case.js';
import { GeneratePanelPositionWithAiUseCase } from './use-cases/generate-panel-position-with-ai.use.case.js';
import { UpdateDashboardWidgetUseCase } from './use-cases/update-panel-position.use.case.js';

@Module({
	imports: [TypeOrmModule.forFeature([UserEntity, LogOutEntity]), AICoreModule],
	providers: [
		{
			provide: BaseType.GLOBAL_DB_CONTEXT,
			useClass: GlobalDatabaseContext,
		},
		{
			provide: UseCaseType.CREATE_DASHBOARD_WIDGET,
			useClass: CreatePanelPositionUseCase,
		},
		{
			provide: UseCaseType.UPDATE_DASHBOARD_WIDGET,
			useClass: UpdateDashboardWidgetUseCase,
		},
		{
			provide: UseCaseType.DELETE_DASHBOARD_WIDGET,
			useClass: DeletePanelPositionUseCase,
		},
		{
			provide: UseCaseType.GENERATE_WIDGET_WITH_AI,
			useClass: GeneratePanelPositionWithAiUseCase,
		},
	],
	controllers: [DashboardWidgetController],
	exports: [],
})
export class PanelPositionModule {
	public configure(consumer: MiddlewareConsumer): void {
		consumer
			.apply(AuthMiddleware)
			.forRoutes(
				{ path: '/dashboard/:dashboardId/widget/:connectionId', method: RequestMethod.POST },
				{ path: '/dashboard/:dashboardId/widget/generate/:connectionId', method: RequestMethod.POST },
				{ path: '/dashboard/:dashboardId/widget/:widgetId/:connectionId', method: RequestMethod.PUT },
				{ path: '/dashboard/:dashboardId/widget/:widgetId/:connectionId', method: RequestMethod.DELETE },
				{ path: '/dashboard/:dashboardId/panel-position/:connectionId', method: RequestMethod.POST },
				{ path: '/dashboard/:dashboardId/panel-position/generate/:connectionId', method: RequestMethod.POST },
				{ path: '/dashboard/:dashboardId/panel-position/:panelPositionId/:connectionId', method: RequestMethod.PUT },
				{ path: '/dashboard/:dashboardId/panel-position/:panelPositionId/:connectionId', method: RequestMethod.DELETE },
			);
	}
}
