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
	Query,
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
import { CreateSavedDbQueryDs } from './data-structures/create-saved-db-query.ds.js';
import { ExecuteSavedDbQueryDs } from './data-structures/execute-saved-db-query.ds.js';
import { FindAllSavedDbQueriesDs } from './data-structures/find-all-saved-db-queries.ds.js';
import { FindSavedDbQueryDs } from './data-structures/find-saved-db-query.ds.js';
import { UpdateSavedDbQueryDs } from './data-structures/update-saved-db-query.ds.js';
import { CreateSavedDbQueryDto } from './dto/create-saved-db-query.dto.js';
import { ExecuteSavedDbQueryResultDto } from './dto/execute-saved-db-query-result.dto.js';
import { FoundSavedDbQueryDto } from './dto/found-saved-db-query.dto.js';
import { TestDbQueryDto } from './dto/test-db-query.dto.js';
import { TestDbQueryResultDto } from './dto/test-db-query-result.dto.js';
import { UpdateSavedDbQueryDto } from './dto/update-saved-db-query.dto.js';
import {
	ICreateSavedDbQuery,
	IDeleteSavedDbQuery,
	IExecuteSavedDbQuery,
	IFindAllSavedDbQueries,
	IFindSavedDbQuery,
	ITestDbQuery,
	IUpdateSavedDbQuery,
} from './use-cases/saved-db-query-use-cases.interface.js';
import { TestDbQueryDs } from './data-structures/test-db-query.ds.js';

@UseInterceptors(SentryInterceptor)
@Controller()
@ApiBearerAuth()
@ApiTags('Saved database queries')
@Injectable()
export class SavedDbQueryController {
	constructor(
		@Inject(UseCaseType.CREATE_SAVED_DB_QUERY)
		private readonly createSavedDbQueryUseCase: ICreateSavedDbQuery,
		@Inject(UseCaseType.UPDATE_SAVED_DB_QUERY)
		private readonly updateSavedDbQueryUseCase: IUpdateSavedDbQuery,
		@Inject(UseCaseType.FIND_SAVED_DB_QUERY)
		private readonly findSavedDbQueryUseCase: IFindSavedDbQuery,
		@Inject(UseCaseType.FIND_ALL_SAVED_DB_QUERIES)
		private readonly findAllSavedDbQueriesUseCase: IFindAllSavedDbQueries,
		@Inject(UseCaseType.DELETE_SAVED_DB_QUERY)
		private readonly deleteSavedDbQueryUseCase: IDeleteSavedDbQuery,
		@Inject(UseCaseType.EXECUTE_SAVED_DB_QUERY)
		private readonly executeSavedDbQueryUseCase: IExecuteSavedDbQuery,
		@Inject(UseCaseType.TEST_DB_QUERY)
		private readonly testDbQueryUseCase: ITestDbQuery,
	) {}

	@ApiOperation({ summary: 'Get all saved queries for a connection' })
	@ApiResponse({
		status: 200,
		description: 'Saved queries found.',
		type: FoundSavedDbQueryDto,
		isArray: true,
	})
	@ApiParam({ name: 'connectionId', required: true })
	@UseGuards(ConnectionReadGuard)
	@Get('/connection/:connectionId/saved-queries')
	async findAll(
		@SlugUuid('connectionId') connectionId: string,
		@MasterPassword() masterPwd: string,
	): Promise<FoundSavedDbQueryDto[]> {
		if (!connectionId) {
			throw new HttpException(
				{
					message: Messages.CONNECTION_ID_MISSING,
				},
				HttpStatus.BAD_REQUEST,
			);
		}
		const inputData: FindAllSavedDbQueriesDs = {
			connectionId,
			masterPassword: masterPwd,
		};
		return await this.findAllSavedDbQueriesUseCase.execute(inputData, InTransactionEnum.OFF);
	}

	@ApiOperation({ summary: 'Get a saved query by id' })
	@ApiResponse({
		status: 200,
		description: 'Saved query found.',
		type: FoundSavedDbQueryDto,
	})
	@ApiParam({ name: 'connectionId', required: true })
	@ApiParam({ name: 'queryId', required: true })
	@UseGuards(ConnectionReadGuard)
	@Get('/connection/:connectionId/saved-query/:queryId')
	async findOne(
		@SlugUuid('connectionId') connectionId: string,
		@Param('queryId') queryId: string,
		@MasterPassword() masterPwd: string,
	): Promise<FoundSavedDbQueryDto> {
		if (!connectionId) {
			throw new HttpException(
				{
					message: Messages.CONNECTION_ID_MISSING,
				},
				HttpStatus.BAD_REQUEST,
			);
		}
		const inputData: FindSavedDbQueryDs = {
			queryId,
			connectionId,
			masterPassword: masterPwd,
		};
		return await this.findSavedDbQueryUseCase.execute(inputData, InTransactionEnum.OFF);
	}

	@ApiOperation({ summary: 'Create a new saved query' })
	@ApiResponse({
		status: 201,
		description: 'Saved query created.',
		type: FoundSavedDbQueryDto,
	})
	@ApiBody({ type: CreateSavedDbQueryDto })
	@ApiParam({ name: 'connectionId', required: true })
	@UseGuards(ConnectionEditGuard)
	@Post('/connection/:connectionId/saved-query')
	async create(
		@SlugUuid('connectionId') connectionId: string,
		@MasterPassword() masterPwd: string,
		@Body() createDto: CreateSavedDbQueryDto,
	): Promise<FoundSavedDbQueryDto> {
		if (!connectionId) {
			throw new HttpException(
				{
					message: Messages.CONNECTION_ID_MISSING,
				},
				HttpStatus.BAD_REQUEST,
			);
		}
		const inputData: CreateSavedDbQueryDs = {
			connectionId,
			masterPassword: masterPwd,
			name: createDto.name,
			description: createDto.description,
			query_text: createDto.query_text,
		};
		return await this.createSavedDbQueryUseCase.execute(inputData, InTransactionEnum.OFF);
	}

	@ApiOperation({ summary: 'Update a saved query' })
	@ApiResponse({
		status: 200,
		description: 'Saved query updated.',
		type: FoundSavedDbQueryDto,
	})
	@ApiBody({ type: UpdateSavedDbQueryDto })
	@ApiParam({ name: 'connectionId', required: true })
	@ApiParam({ name: 'queryId', required: true })
	@UseGuards(ConnectionEditGuard)
	@Put('/connection/:connectionId/saved-query/:queryId')
	async update(
		@SlugUuid('connectionId') connectionId: string,
		@Param('queryId') queryId: string,
		@MasterPassword() masterPwd: string,
		@Body() updateDto: UpdateSavedDbQueryDto,
	): Promise<FoundSavedDbQueryDto> {
		if (!connectionId) {
			throw new HttpException(
				{
					message: Messages.CONNECTION_ID_MISSING,
				},
				HttpStatus.BAD_REQUEST,
			);
		}
		const inputData: UpdateSavedDbQueryDs = {
			queryId,
			connectionId,
			masterPassword: masterPwd,
			name: updateDto.name,
			description: updateDto.description,
			query_text: updateDto.query_text,
		};
		return await this.updateSavedDbQueryUseCase.execute(inputData, InTransactionEnum.OFF);
	}

	@ApiOperation({ summary: 'Delete a saved query' })
	@ApiResponse({
		status: 200,
		description: 'Saved query deleted.',
		type: FoundSavedDbQueryDto,
	})
	@ApiParam({ name: 'connectionId', required: true })
	@ApiParam({ name: 'queryId', required: true })
	@UseGuards(ConnectionEditGuard)
	@Delete('/connection/:connectionId/saved-query/:queryId')
	async delete(
		@SlugUuid('connectionId') connectionId: string,
		@Param('queryId') queryId: string,
		@MasterPassword() masterPwd: string,
	): Promise<FoundSavedDbQueryDto> {
		if (!connectionId) {
			throw new HttpException(
				{
					message: Messages.CONNECTION_ID_MISSING,
				},
				HttpStatus.BAD_REQUEST,
			);
		}
		const inputData: FindSavedDbQueryDs = {
			queryId,
			connectionId,
			masterPassword: masterPwd,
		};
		return await this.deleteSavedDbQueryUseCase.execute(inputData, InTransactionEnum.OFF);
	}

	@ApiOperation({ summary: 'Execute a saved query' })
	@ApiResponse({
		status: 200,
		description: 'Query executed successfully.',
		type: ExecuteSavedDbQueryResultDto,
	})
	@ApiParam({ name: 'connectionId', required: true })
	@ApiParam({ name: 'queryId', required: true })
	@UseGuards(ConnectionReadGuard)
	@Post('/connection/:connectionId/saved-query/:queryId/execute')
	async execute(
		@SlugUuid('connectionId') connectionId: string,
		@Param('queryId') queryId: string,
		@Query('tableName') tableName: string,
		@MasterPassword() masterPwd: string,
		@UserId() userId: string,
	): Promise<ExecuteSavedDbQueryResultDto> {
		if (!connectionId) {
			throw new HttpException(
				{
					message: Messages.CONNECTION_ID_MISSING,
				},
				HttpStatus.BAD_REQUEST,
			);
		}
		const inputData: ExecuteSavedDbQueryDs = {
			queryId,
			connectionId,
			masterPassword: masterPwd,
			tableName,
			userId,
		};
		return await this.executeSavedDbQueryUseCase.execute(inputData, InTransactionEnum.OFF);
	}

	@ApiOperation({ summary: 'Test a query without saving it' })
	@ApiResponse({
		status: 201,
		description: 'Query executed successfully.',
		type: TestDbQueryResultDto,
	})
	@ApiBody({ type: TestDbQueryDto })
	@ApiParam({ name: 'connectionId', required: true })
	@UseGuards(ConnectionReadGuard)
	@Post('/connection/:connectionId/query/test')
	async testQuery(
		@SlugUuid('connectionId') connectionId: string,
		@MasterPassword() masterPwd: string,
		@UserId() userId: string,
		@Body() testDto: TestDbQueryDto,
	): Promise<TestDbQueryResultDto> {
		if (!connectionId) {
			throw new HttpException(
				{
					message: Messages.CONNECTION_ID_MISSING,
				},
				HttpStatus.BAD_REQUEST,
			);
		}
		const inputData: TestDbQueryDs = {
			connectionId,
			masterPassword: masterPwd,
			query_text: testDto.query_text,
			tableName: testDto.tableName,
			userId,
		};
		return await this.testDbQueryUseCase.execute(inputData, InTransactionEnum.OFF);
	}
}
