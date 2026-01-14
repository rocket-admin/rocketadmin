import {
	Body,
	Controller,
	Delete,
	Inject,
	Injectable,
	Param,
	Post,
	Put,
	UseGuards,
	UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UseCaseType } from '../../../common/data-injection.tokens.js';
import { MasterPassword } from '../../../decorators/master-password.decorator.js';
import { SlugUuid } from '../../../decorators/slug-uuid.decorator.js';
import { UserId } from '../../../decorators/user-id.decorator.js';
import { InTransactionEnum } from '../../../enums/in-transaction.enum.js';
import { ConnectionEditGuard } from '../../../guards/connection-edit.guard.js';
import { SentryInterceptor } from '../../../interceptors/sentry.interceptor.js';
import { CreateDashboardWidgetDs } from './data-structures/create-dashboard-widget.ds.js';
import { DeleteDashboardWidgetDs } from './data-structures/delete-dashboard-widget.ds.js';
import { UpdateDashboardWidgetDs } from './data-structures/update-dashboard-widget.ds.js';
import { CreateDashboardWidgetDto } from './dto/create-dashboard-widget.dto.js';
import { FoundDashboardWidgetDto } from './dto/found-dashboard-widget.dto.js';
import { UpdateDashboardWidgetDto } from './dto/update-dashboard-widget.dto.js';
import {
	ICreateDashboardWidget,
	IDeleteDashboardWidget,
	IUpdateDashboardWidget,
} from './use-cases/dashboard-use-cases.interface.js';

@UseInterceptors(SentryInterceptor)
@Controller()
@ApiBearerAuth()
@ApiTags('Dashboard Widgets')
@Injectable()
export class DashboardWidgetController {
	constructor(
		@Inject(UseCaseType.CREATE_DASHBOARD_WIDGET)
		private readonly createDashboardWidgetUseCase: ICreateDashboardWidget,
		@Inject(UseCaseType.UPDATE_DASHBOARD_WIDGET)
		private readonly updateDashboardWidgetUseCase: IUpdateDashboardWidget,
		@Inject(UseCaseType.DELETE_DASHBOARD_WIDGET)
		private readonly deleteDashboardWidgetUseCase: IDeleteDashboardWidget,
	) {}

	@ApiOperation({ summary: 'Create a new widget in a dashboard' })
	@ApiResponse({
		status: 201,
		description: 'Widget created.',
		type: FoundDashboardWidgetDto,
	})
	@ApiBody({ type: CreateDashboardWidgetDto })
	@ApiParam({ name: 'dashboardId', required: true })
	@ApiParam({ name: 'connectionId', required: true })
	@UseGuards(ConnectionEditGuard)
	@Post('/dashboard/:dashboardId/widget/:connectionId')
	async createWidget(
		@SlugUuid('connectionId') connectionId: string,
		@Param('dashboardId') dashboardId: string,
		@MasterPassword() masterPwd: string,
		@UserId() userId: string,
		@Body() createDto: CreateDashboardWidgetDto,
	): Promise<FoundDashboardWidgetDto> {
		const inputData: CreateDashboardWidgetDs = {
			dashboardId,
			connectionId,
			masterPassword: masterPwd,
			userId,
			widget_type: createDto.widget_type,
			name: createDto.name,
			description: createDto.description,
			position_x: createDto.position_x,
			position_y: createDto.position_y,
			width: createDto.width,
			height: createDto.height,
			widget_options: createDto.widget_options,
			query_id: createDto.query_id,
		};
		return await this.createDashboardWidgetUseCase.execute(inputData, InTransactionEnum.ON);
	}

	@ApiOperation({ summary: 'Update a widget in a dashboard' })
	@ApiResponse({
		status: 200,
		description: 'Widget updated.',
		type: FoundDashboardWidgetDto,
	})
	@ApiBody({ type: UpdateDashboardWidgetDto })
	@ApiParam({ name: 'dashboardId', required: true })
	@ApiParam({ name: 'widgetId', required: true })
	@ApiParam({ name: 'connectionId', required: true })
	@UseGuards(ConnectionEditGuard)
	@Put('/dashboard/:dashboardId/widget/:widgetId/:connectionId')
	async updateWidget(
		@SlugUuid('connectionId') connectionId: string,
		@Param('dashboardId') dashboardId: string,
		@Param('widgetId') widgetId: string,
		@MasterPassword() masterPwd: string,
		@UserId() userId: string,
		@Body() updateDto: UpdateDashboardWidgetDto,
	): Promise<FoundDashboardWidgetDto> {
		const inputData: UpdateDashboardWidgetDs = {
			widgetId,
			dashboardId,
			connectionId,
			masterPassword: masterPwd,
			userId,
			widget_type: updateDto.widget_type,
			name: updateDto.name,
			description: updateDto.description,
			position_x: updateDto.position_x,
			position_y: updateDto.position_y,
			width: updateDto.width,
			height: updateDto.height,
			widget_options: updateDto.widget_options,
			query_id: updateDto.query_id,
		};
		return await this.updateDashboardWidgetUseCase.execute(inputData, InTransactionEnum.ON);
	}

	@ApiOperation({ summary: 'Delete a widget from a dashboard' })
	@ApiResponse({
		status: 200,
		description: 'Widget deleted.',
		type: FoundDashboardWidgetDto,
	})
	@ApiParam({ name: 'dashboardId', required: true })
	@ApiParam({ name: 'widgetId', required: true })
	@ApiParam({ name: 'connectionId', required: true })
	@UseGuards(ConnectionEditGuard)
	@Delete('/dashboard/:dashboardId/widget/:widgetId/:connectionId')
	async deleteWidget(
		@SlugUuid('connectionId') connectionId: string,
		@Param('dashboardId') dashboardId: string,
		@Param('widgetId') widgetId: string,
		@MasterPassword() masterPwd: string,
		@UserId() userId: string,
	): Promise<FoundDashboardWidgetDto> {
		const inputData: DeleteDashboardWidgetDs = {
			widgetId,
			dashboardId,
			connectionId,
			masterPassword: masterPwd,
			userId,
		};
		return await this.deleteDashboardWidgetUseCase.execute(inputData, InTransactionEnum.ON);
	}
}
