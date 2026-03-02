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
import { Timeout, TimeoutDefaults } from '../../../decorators/timeout.decorator.js';
import { UserId } from '../../../decorators/user-id.decorator.js';
import { InTransactionEnum } from '../../../enums/in-transaction.enum.js';
import { ConnectionEditGuard } from '../../../guards/connection-edit.guard.js';
import { SentryInterceptor } from '../../../interceptors/sentry.interceptor.js';
import { CreatePanelPositionDs } from './data-structures/create-panel-position.ds.js';
import { DeletePanelPositionDs } from './data-structures/delete-panel-position.ds.js';
import { GeneratePanelPositionWithAiDs } from './data-structures/generate-panel-position-with-ai.ds.js';
import { GenerateTableDashboardWithAiDs } from './data-structures/generate-table-dashboard-with-ai.ds.js';
import { UpdatePanelPositionDs } from './data-structures/update-panel-position.ds.js';
import { CreatePanelPositionDto } from './dto/create-panel-position.dto.js';
import { FoundPanelPositionDto } from './dto/found-panel-position.dto.js';
import { GeneratedPanelWithPositionDto } from './dto/generated-panel-with-position.dto.js';
import { GeneratePanelPositionWithAiDto } from './dto/generate-panel-position-with-ai.dto.js';
import { GenerateTableDashboardWithAiDto } from './dto/generate-table-dashboard-with-ai.dto.js';
import { UpdatePanelPositionDto } from './dto/update-panel-position.dto.js';
import {
	ICreatePanelPositionWidget,
	IDeletePanelPosition,
	IGeneratePanelPositionWithAi,
	IGenerateTableDashboardWithAi,
	IUpdatePanelPosition,
} from './use-cases/panel-position-use-cases.interface.js';

@UseInterceptors(SentryInterceptor)
@Timeout()
@Controller()
@ApiBearerAuth()
@ApiTags('Dashboard Widgets')
@Injectable()
export class DashboardWidgetController {
	constructor(
		@Inject(UseCaseType.CREATE_DASHBOARD_WIDGET)
		private readonly createDashboardWidgetUseCase: ICreatePanelPositionWidget,
		@Inject(UseCaseType.UPDATE_DASHBOARD_WIDGET)
		private readonly updateDashboardWidgetUseCase: IUpdatePanelPosition,
		@Inject(UseCaseType.DELETE_DASHBOARD_WIDGET)
		private readonly deleteDashboardWidgetUseCase: IDeletePanelPosition,
		@Inject(UseCaseType.GENERATE_WIDGET_WITH_AI)
		private readonly generateWidgetWithAiUseCase: IGeneratePanelPositionWithAi,
		@Inject(UseCaseType.GENERATE_TABLE_DASHBOARD_WITH_AI)
		private readonly generateTableDashboardWithAiUseCase: IGenerateTableDashboardWithAi,
	) {}

	@ApiOperation({ summary: 'Create a new widget in a dashboard' })
	@ApiResponse({
		status: 201,
		description: 'Widget created.',
		type: FoundPanelPositionDto,
	})
	@ApiBody({ type: CreatePanelPositionDto })
	@ApiParam({ name: 'dashboardId', required: true })
	@ApiParam({ name: 'connectionId', required: true })
	@UseGuards(ConnectionEditGuard)
	@Post('/dashboard/:dashboardId/widget/:connectionId')
	async createWidget(
		@SlugUuid('connectionId') connectionId: string,
		@Param('dashboardId') dashboardId: string,
		@MasterPassword() masterPwd: string,
		@UserId() userId: string,
		@Body() createDto: CreatePanelPositionDto,
	): Promise<FoundPanelPositionDto> {
		const inputData: CreatePanelPositionDs = {
			dashboardId,
			connectionId,
			masterPassword: masterPwd,
			userId,
			query_id: createDto.query_id,
			position_x: createDto.position_x,
			position_y: createDto.position_y,
			width: createDto.width,
			height: createDto.height,
		};
		return await this.createDashboardWidgetUseCase.execute(inputData, InTransactionEnum.ON);
	}

	@ApiOperation({ summary: 'Update a widget in a dashboard' })
	@ApiResponse({
		status: 200,
		description: 'Widget updated.',
		type: FoundPanelPositionDto,
	})
	@ApiBody({ type: UpdatePanelPositionDto })
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
		@Body() updateDto: UpdatePanelPositionDto,
	): Promise<FoundPanelPositionDto> {
		const inputData: UpdatePanelPositionDs = {
			widgetId,
			dashboardId,
			connectionId,
			masterPassword: masterPwd,
			userId,
			query_id: updateDto.query_id,
			position_x: updateDto.position_x,
			position_y: updateDto.position_y,
			width: updateDto.width,
			height: updateDto.height,
		};
		return await this.updateDashboardWidgetUseCase.execute(inputData, InTransactionEnum.ON);
	}

	@ApiOperation({ summary: 'Delete a widget from a dashboard' })
	@ApiResponse({
		status: 200,
		description: 'Widget deleted.',
		type: FoundPanelPositionDto,
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
	): Promise<FoundPanelPositionDto> {
		const inputData: DeletePanelPositionDs = {
			widgetId,
			dashboardId,
			connectionId,
			masterPassword: masterPwd,
			userId,
		};
		return await this.deleteDashboardWidgetUseCase.execute(inputData, InTransactionEnum.ON);
	}

	@ApiOperation({
		summary: 'Generate a panel using AI',
		description:
			'Creates a new panel with SQL query and chart configuration generated by AI based on natural language description. AI autonomously discovers relevant tables.',
	})
	@ApiResponse({
		status: 201,
		description: 'Panel configuration generated by AI (not yet saved).',
		type: GeneratedPanelWithPositionDto,
	})
	@ApiBody({ type: GeneratePanelPositionWithAiDto })
	@ApiParam({ name: 'connectionId', required: true })
	@UseGuards(ConnectionEditGuard)
	@Timeout(TimeoutDefaults.AI)
	@Post('/widget/generate/:connectionId')
	async generateWidgetWithAi(
		@SlugUuid('connectionId') connectionId: string,
		@MasterPassword() masterPwd: string,
		@UserId() userId: string,
		@Body() generateDto: GeneratePanelPositionWithAiDto,
	): Promise<GeneratedPanelWithPositionDto> {
		const inputData: GeneratePanelPositionWithAiDs = {
			connectionId,
			masterPassword: masterPwd,
			userId,
			chart_description: generateDto.chart_description,
			name: generateDto.name,
		};
		return await this.generateWidgetWithAiUseCase.execute(inputData, InTransactionEnum.OFF);
	}

	@ApiOperation({
		summary: 'Generate a full table dashboard using AI',
		description:
			'AI autonomously discovers database tables, analyzes their structure, and auto-generates multiple panel configurations for a dashboard',
	})
	@ApiResponse({
		status: 201,
		description: 'Dashboard with panels generated by AI and saved to database.',
	})
	@ApiBody({ type: GenerateTableDashboardWithAiDto })
	@ApiParam({ name: 'connectionId', required: true })
	@UseGuards(ConnectionEditGuard)
	@Timeout(TimeoutDefaults.AI)
	@Post('/dashboard/generate-table-dashboard/:connectionId')
	async generateTableDashboardWithAi(
		@SlugUuid('connectionId') connectionId: string,
		@MasterPassword() masterPwd: string,
		@UserId() userId: string,
		@Body() generateDto: GenerateTableDashboardWithAiDto,
	): Promise<{ success: boolean }> {
		const inputData: GenerateTableDashboardWithAiDs = {
			connectionId,
			masterPassword: masterPwd,
			userId,
			max_panels: generateDto.max_panels,
			dashboard_name: generateDto.dashboard_name,
		};
		return await this.generateTableDashboardWithAiUseCase.execute(inputData, InTransactionEnum.OFF);
	}
}
