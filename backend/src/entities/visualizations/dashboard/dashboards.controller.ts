import {
	Body,
	Controller,
	Delete,
	Get,
	HttpException,
	HttpStatus,
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
import { Messages } from '../../../exceptions/text/messages.js';
import { ConnectionReadGuard } from '../../../guards/connection-read.guard.js';
import { ConnectionEditGuard } from '../../../guards/connection-edit.guard.js';
import { SentryInterceptor } from '../../../interceptors/sentry.interceptor.js';
import { CreateDashboardDs } from './data-structures/create-dashboard.ds.js';
import { FindAllDashboardsDs } from './data-structures/find-all-dashboards.ds.js';
import { FindDashboardDs } from './data-structures/find-dashboard.ds.js';
import { UpdateDashboardDs } from './data-structures/update-dashboard.ds.js';
import { CreateDashboardDto } from './dto/create-dashboard.dto.js';
import { FoundDashboardDto } from './dto/found-dashboard.dto.js';
import { UpdateDashboardDto } from './dto/update-dashboard.dto.js';
import {
	ICreateDashboard,
	IDeleteDashboard,
	IFindAllDashboards,
	IFindDashboard,
	IUpdateDashboard,
} from './use-cases/dashboard-use-cases.interface.js';

@UseInterceptors(SentryInterceptor)
@Controller()
@ApiBearerAuth()
@ApiTags('Dashboards')
@Injectable()
export class DashboardController {
	constructor(
		@Inject(UseCaseType.CREATE_DASHBOARD)
		private readonly createDashboardUseCase: ICreateDashboard,
		@Inject(UseCaseType.UPDATE_DASHBOARD)
		private readonly updateDashboardUseCase: IUpdateDashboard,
		@Inject(UseCaseType.FIND_DASHBOARD)
		private readonly findDashboardUseCase: IFindDashboard,
		@Inject(UseCaseType.FIND_ALL_DASHBOARDS)
		private readonly findAllDashboardsUseCase: IFindAllDashboards,
		@Inject(UseCaseType.DELETE_DASHBOARD)
		private readonly deleteDashboardUseCase: IDeleteDashboard,
	) {}

	@ApiOperation({ summary: 'Get all dashboards for a connection' })
	@ApiResponse({
		status: 200,
		description: 'Dashboards found.',
		type: FoundDashboardDto,
		isArray: true,
	})
	@ApiParam({ name: 'connectionId', required: true })
	@UseGuards(ConnectionReadGuard)
	@Get('/dashboards/:connectionId')
	async findAllDashboards(
		@SlugUuid('connectionId') connectionId: string,
		@MasterPassword() masterPwd: string,
		@UserId() userId: string,
	): Promise<FoundDashboardDto[]> {
		if (!connectionId) {
			throw new HttpException(
				{
					message: Messages.CONNECTION_ID_MISSING,
				},
				HttpStatus.BAD_REQUEST,
			);
		}
		const inputData: FindAllDashboardsDs = {
			connectionId,
			masterPassword: masterPwd,
			userId,
		};
		return await this.findAllDashboardsUseCase.execute(inputData, InTransactionEnum.OFF);
	}

	@ApiOperation({ summary: 'Get a dashboard by id' })
	@ApiResponse({
		status: 200,
		description: 'Dashboard found.',
		type: FoundDashboardDto,
	})
	@ApiParam({ name: 'dashboardId', required: true })
	@ApiParam({ name: 'connectionId', required: true })
	@UseGuards(ConnectionReadGuard)
	@Get('/dashboard/:dashboardId/:connectionId')
	async findDashboard(
		@SlugUuid('connectionId') connectionId: string,
		@Param('dashboardId') dashboardId: string,
		@MasterPassword() masterPwd: string,
		@UserId() userId: string,
	): Promise<FoundDashboardDto> {
		const inputData: FindDashboardDs = {
			dashboardId,
			connectionId,
			masterPassword: masterPwd,
			userId,
		};
		return await this.findDashboardUseCase.execute(inputData, InTransactionEnum.OFF);
	}

	@ApiOperation({ summary: 'Create a new dashboard' })
	@ApiResponse({
		status: 201,
		description: 'Dashboard created.',
		type: FoundDashboardDto,
	})
	@ApiBody({ type: CreateDashboardDto })
	@ApiParam({ name: 'connectionId', required: true })
	@UseGuards(ConnectionEditGuard)
	@Post('/dashboards/:connectionId')
	async createDashboard(
		@SlugUuid('connectionId') connectionId: string,
		@MasterPassword() masterPwd: string,
		@UserId() userId: string,
		@Body() createDto: CreateDashboardDto,
	): Promise<FoundDashboardDto> {
		if (!connectionId) {
			throw new HttpException(
				{
					message: Messages.CONNECTION_ID_MISSING,
				},
				HttpStatus.BAD_REQUEST,
			);
		}
		const inputData: CreateDashboardDs = {
			connectionId,
			masterPassword: masterPwd,
			userId,
			name: createDto.name,
			description: createDto.description,
		};
		return await this.createDashboardUseCase.execute(inputData, InTransactionEnum.ON);
	}

	@ApiOperation({ summary: 'Update a dashboard' })
	@ApiResponse({
		status: 200,
		description: 'Dashboard updated.',
		type: FoundDashboardDto,
	})
	@ApiBody({ type: UpdateDashboardDto })
	@ApiParam({ name: 'dashboardId', required: true })
	@ApiParam({ name: 'connectionId', required: true })
	@UseGuards(ConnectionEditGuard)
	@Put('/dashboard/:dashboardId/:connectionId')
	async updateDashboard(
		@SlugUuid('connectionId') connectionId: string,
		@Param('dashboardId') dashboardId: string,
		@MasterPassword() masterPwd: string,
		@UserId() userId: string,
		@Body() updateDto: UpdateDashboardDto,
	): Promise<FoundDashboardDto> {
		const inputData: UpdateDashboardDs = {
			dashboardId,
			connectionId,
			masterPassword: masterPwd,
			userId,
			name: updateDto.name,
			description: updateDto.description,
		};
		return await this.updateDashboardUseCase.execute(inputData, InTransactionEnum.ON);
	}

	@ApiOperation({ summary: 'Delete a dashboard' })
	@ApiResponse({
		status: 200,
		description: 'Dashboard deleted.',
		type: FoundDashboardDto,
	})
	@ApiParam({ name: 'dashboardId', required: true })
	@ApiParam({ name: 'connectionId', required: true })
	@UseGuards(ConnectionEditGuard)
	@Delete('/dashboard/:dashboardId/:connectionId')
	async deleteDashboard(
		@SlugUuid('connectionId') connectionId: string,
		@Param('dashboardId') dashboardId: string,
		@MasterPassword() masterPwd: string,
		@UserId() userId: string,
	): Promise<FoundDashboardDto> {
		const inputData: FindDashboardDs = {
			dashboardId,
			connectionId,
			masterPassword: masterPwd,
			userId,
		};
		return await this.deleteDashboardUseCase.execute(inputData, InTransactionEnum.ON);
	}
}
