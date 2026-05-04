import {
	Body,
	Controller,
	Delete,
	Get,
	HttpStatus,
	Inject,
	Injectable,
	Post,
	Put,
	UseGuards,
	UseInterceptors,
} from '@nestjs/common';
import { HttpException } from '@nestjs/common/exceptions/http.exception.js';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UseCaseType } from '../../common/data-injection.tokens.js';
import { MasterPassword } from '../../decorators/master-password.decorator.js';
import { SlugUuid } from '../../decorators/slug-uuid.decorator.js';
import { Timeout } from '../../decorators/timeout.decorator.js';
import { UserId } from '../../decorators/user-id.decorator.js';
import { InTransactionEnum } from '../../enums/in-transaction.enum.js';
import { Messages } from '../../exceptions/text/messages.js';
import { ConnectionEditGuard } from '../../guards/connection-edit.guard.js';
import { ConnectionReadGuard } from '../../guards/connection-read.guard.js';
import { SentryInterceptor } from '../../interceptors/sentry.interceptor.js';
import { CreateConnectionPropertiesDs } from './application/data-structures/create-connection-properties.ds.js';
import { FoundConnectionPropertiesDs } from './application/data-structures/found-connection-properties.ds.js';
import { CreateConnectionPropertiesDto } from './dto/create-connection-properties.dto.js';
import {
	ICreateConnectionProperties,
	IDeleteConnectionProperties,
	IFindConnectionProperties,
	IUpdateConnectionProperties,
} from './use-cases/connection-properties-use.cases.interface.js';

@UseInterceptors(SentryInterceptor)
@Timeout()
@Controller()
@ApiBearerAuth()
@ApiTags('Connection properties')
@Injectable()
export class ConnectionPropertiesController {
	constructor(
		@Inject(UseCaseType.FIND_CONNECTION_PROPERTIES)
		private readonly findConnectionPropertiesUseCase: IFindConnectionProperties,
		@Inject(UseCaseType.CREATE_CONNECTION_PROPERTIES)
		private readonly createConnectionPropertiesUseCase: ICreateConnectionProperties,
		@Inject(UseCaseType.UPDATE_CONNECTION_PROPERTIES)
		private readonly updateConnectionPropertiesUseCase: IUpdateConnectionProperties,
		@Inject(UseCaseType.DELETE_CONNECTION_PROPERTIES)
		private readonly deleteConnectionPropertiesUseCase: IDeleteConnectionProperties,
	) {}

	@ApiOperation({ summary: 'Find connection properties' })
	@ApiResponse({
		status: 200,
		description: 'Receive connection properties.',
		type: FoundConnectionPropertiesDs,
	})
	@UseGuards(ConnectionReadGuard)
	@Get('/connection/properties/:connectionId')
	async findConnectionProperties(
		@SlugUuid('connectionId') connectionId: string,
	): Promise<FoundConnectionPropertiesDs | null> {
		if (!connectionId) {
			throw new HttpException(
				{
					message: Messages.ID_MISSING,
				},
				HttpStatus.BAD_REQUEST,
			);
		}
		return await this.findConnectionPropertiesUseCase.execute(connectionId, InTransactionEnum.OFF);
	}

	@ApiOperation({ summary: 'Create new connection properties' })
	@ApiBody({
		type: CreateConnectionPropertiesDto,
	})
	@ApiResponse({
		status: 201,
		description: 'Create connection properties.',
		type: FoundConnectionPropertiesDs,
	})
	@UseGuards(ConnectionEditGuard)
	@Post('/connection/properties/:connectionId')
	async createConnectionProperties(
		@Body() connectionPropertiesData: CreateConnectionPropertiesDto,
		@UserId() userId: string,
		@MasterPassword() masterPwd: string,
		@SlugUuid('connectionId') connectionId: string,
	): Promise<FoundConnectionPropertiesDs> {
		if (!connectionId) {
			throw new HttpException(
				{
					message: Messages.ID_MISSING,
				},
				HttpStatus.BAD_REQUEST,
			);
		}
		const inputData = this.buildConnectionPropertiesDs(connectionPropertiesData, connectionId, userId, masterPwd);

		return await this.createConnectionPropertiesUseCase.execute(inputData, InTransactionEnum.ON);
	}

	@ApiOperation({ summary: 'Update connection properties' })
	@ApiBody({
		type: CreateConnectionPropertiesDto,
	})
	@ApiResponse({
		status: 200,
		description: 'Update connection properties.',
		type: FoundConnectionPropertiesDs,
	})
	@UseGuards(ConnectionEditGuard)
	@Put('/connection/properties/:connectionId')
	async updateConnectionProperties(
		@Body() connectionPropertiesData: CreateConnectionPropertiesDto,
		@UserId() userId: string,
		@MasterPassword() masterPwd: string,
		@SlugUuid('connectionId') connectionId: string,
	): Promise<FoundConnectionPropertiesDs> {
		if (!connectionId) {
			throw new HttpException(
				{
					message: Messages.ID_MISSING,
				},
				HttpStatus.BAD_REQUEST,
			);
		}

		const inputData = this.buildConnectionPropertiesDs(connectionPropertiesData, connectionId, userId, masterPwd);

		return await this.updateConnectionPropertiesUseCase.execute(inputData, InTransactionEnum.ON);
	}

	@ApiOperation({ summary: 'Delete connection properties' })
	@ApiResponse({
		status: 200,
		description: 'Delete connection properties.',
		type: FoundConnectionPropertiesDs,
	})
	@UseGuards(ConnectionEditGuard)
	@Delete('/connection/properties/:connectionId')
	async deleteConnectionProperties(
		@SlugUuid('connectionId') connectionId: string,
	): Promise<FoundConnectionPropertiesDs> {
		if (!connectionId) {
			throw new HttpException(
				{
					message: Messages.ID_MISSING,
				},
				HttpStatus.BAD_REQUEST,
			);
		}
		return await this.deleteConnectionPropertiesUseCase.execute(connectionId, InTransactionEnum.ON);
	}

	private buildConnectionPropertiesDs(
		dto: CreateConnectionPropertiesDto,
		connectionId: string,
		userId: string,
		masterPwd: string,
	): CreateConnectionPropertiesDs {
		return {
			connectionId,
			userId,
			master_password: masterPwd,
			...dto,
		};
	}
}
