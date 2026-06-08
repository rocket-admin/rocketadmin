import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	HttpException,
	HttpStatus,
	Inject,
	Injectable,
	Post,
	Put,
	Query,
	UseGuards,
	UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType, UseCaseType } from '../../../common/data-injection.tokens.js';
import { MasterPassword } from '../../../decorators/master-password.decorator.js';
import { QueryTableName } from '../../../decorators/query-table-name.decorator.js';
import { SlugUuid } from '../../../decorators/slug-uuid.decorator.js';
import { Timeout, TimeoutDefaults } from '../../../decorators/timeout.decorator.js';
import { UserId } from '../../../decorators/user-id.decorator.js';
import { InTransactionEnum } from '../../../enums/in-transaction.enum.js';
import { ConnectionNotFoundException } from '../../../exceptions/custom-exceptions/connection-not-found-exception.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { TableAddGuard } from '../../../guards/table-add.guard.js';
import { TableDeleteGuard } from '../../../guards/table-delete.guard.js';
import { TableEditGuard } from '../../../guards/table-edit.guard.js';
import { TableReadGuard } from '../../../guards/table-read.guard.js';
import { isConnectionTypeAgent } from '../../../helpers/is-connection-entity-agent.js';
import { isObjectEmpty } from '../../../helpers/is-object-empty.js';
import { isObjectPropertyExists } from '../../../helpers/validators/is-object-property-exists-validator.js';
import { SentryInterceptor } from '../../../interceptors/sentry.interceptor.js';
import { FindAllRowsWithBodyFiltersDto } from '../dto/find-rows-with-body-filters.dto.js';
import { PureCreateRowDs } from './application/data-structures/pure-create-row.ds.js';
import { PureCrudRowResponseDs } from './application/data-structures/pure-crud-row-response.ds.js';
import { PureDeleteRowDs } from './application/data-structures/pure-delete-row.ds.js';
import { PureFoundRowsResponseDs } from './application/data-structures/pure-found-rows-response.ds.js';
import { PureGetRowsDs } from './application/data-structures/pure-get-rows.ds.js';
import { PureReadRowDs } from './application/data-structures/pure-read-row.ds.js';
import { PureUpdateRowDs } from './application/data-structures/pure-update-row.ds.js';
import {
	IPureCreateRowInTable,
	IPureDeleteRowFromTable,
	IPureGetRowsFromTable,
	IPureReadRowFromTable,
	IPureUpdateRowInTable,
} from './use-cases/table-pure-crud-use-cases.interface.js';

@UseInterceptors(SentryInterceptor)
@Timeout()
@Controller()
@ApiBearerAuth()
@ApiTags('Table pure CRUD operations')
@Injectable()
export class TablePureCrudOperationsController {
	constructor(
		@Inject(UseCaseType.PURE_CREATE_ROW_IN_TABLE)
		private readonly pureCreateRowInTableUseCase: IPureCreateRowInTable,
		@Inject(UseCaseType.PURE_READ_ROW_FROM_TABLE)
		private readonly pureReadRowFromTableUseCase: IPureReadRowFromTable,
		@Inject(UseCaseType.PURE_UPDATE_ROW_IN_TABLE)
		private readonly pureUpdateRowInTableUseCase: IPureUpdateRowInTable,
		@Inject(UseCaseType.PURE_DELETE_ROW_FROM_TABLE)
		private readonly pureDeleteRowFromTableUseCase: IPureDeleteRowFromTable,
		@Inject(UseCaseType.PURE_GET_ROWS_FROM_TABLE)
		private readonly pureGetRowsFromTableUseCase: IPureGetRowsFromTable,
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
	) {}

	@ApiOperation({
		summary: 'Create a single row in a table. API+',
		description: 'Insert a new row and return only the created row. Support access with api key.',
	})
	@ApiBody({ type: Object })
	@ApiResponse({ status: 201, description: 'Row created.', type: PureCrudRowResponseDs })
	@ApiQuery({ name: 'tableName', required: true })
	@UseGuards(TableAddGuard)
	@Post('/table/crud/:connectionId')
	async createRow(
		@Body() body: Record<string, unknown>,
		@SlugUuid('connectionId') connectionId: string,
		@UserId() userId: string,
		@MasterPassword() masterPwd: string,
		@QueryTableName() tableName: string,
	): Promise<PureCrudRowResponseDs> {
		if (!connectionId || isObjectEmpty(body)) {
			throw new HttpException({ message: Messages.PARAMETER_MISSING }, HttpStatus.BAD_REQUEST);
		}
		const inputData: PureCreateRowDs = {
			connectionId,
			masterPwd,
			row: body,
			tableName,
			userId,
		};
		return await this.pureCreateRowInTableUseCase.execute(inputData, InTransactionEnum.OFF);
	}

	@ApiOperation({
		summary: 'Get table rows with filter parameters in body. API+',
		description:
			'Return only rows and pagination. Support search, filtering (in body), ordering and pagination. Support access with api key.',
	})
	@ApiResponse({ status: 200, description: 'Rows found.', type: PureFoundRowsResponseDs })
	@ApiBody({ type: FindAllRowsWithBodyFiltersDto })
	@ApiQuery({ name: 'tableName', required: true })
	@ApiQuery({ name: 'page', required: false })
	@ApiQuery({ name: 'perPage', required: false })
	@ApiQuery({ name: 'search', required: false })
	@UseGuards(TableReadGuard)
	@Timeout(TimeoutDefaults.EXTENDED)
	@Throttle({ default: { limit: 300, ttl: 60000 } })
	@HttpCode(HttpStatus.OK)
	@Post('/table/crud/rows/:connectionId')
	async getRows(
		@QueryTableName() tableName: string,
		@Query('page') page: string,
		@Query('perPage') perPage: string,
		@Query('search') searchingFieldValue: string,
		@Query() query: Record<string, string>,
		@SlugUuid('connectionId') connectionId: string,
		@UserId() userId: string,
		@MasterPassword() masterPwd: string,
		@Body() body: FindAllRowsWithBodyFiltersDto,
	): Promise<PureFoundRowsResponseDs> {
		if (!connectionId) {
			throw new HttpException({ message: Messages.CONNECTION_ID_MISSING }, HttpStatus.BAD_REQUEST);
		}
		let parsedPage = 0;
		let parsedPerPage = 0;
		if (page && perPage) {
			parsedPage = parseInt(page, 10);
			parsedPerPage = parseInt(perPage, 10);
			if ((parsedPage && parsedPage <= 0) || (parsedPerPage && parsedPerPage <= 0)) {
				throw new HttpException({ message: Messages.PAGE_AND_PERPAGE_INVALID }, HttpStatus.BAD_REQUEST);
			}
		}
		const inputData: PureGetRowsDs = {
			connectionId,
			masterPwd,
			page: parsedPage,
			perPage: parsedPerPage,
			query,
			searchingFieldValue,
			tableName,
			userId,
			filters: body?.filters,
		};
		return await this.pureGetRowsFromTableUseCase.execute(inputData, InTransactionEnum.OFF);
	}

	@ApiOperation({
		summary: 'Read a single row from a table by primary key. API+',
		description: 'Return only the found row by primary key. Support access with api key.',
	})
	@ApiResponse({ status: 200, description: 'Row found.', type: PureCrudRowResponseDs })
	@ApiQuery({ name: 'tableName', required: true })
	@UseGuards(TableReadGuard)
	@Get('/table/crud/:connectionId')
	async readRow(
		@Query() query: Record<string, string>,
		@MasterPassword() masterPwd: string,
		@SlugUuid('connectionId') connectionId: string,
		@UserId() userId: string,
		@QueryTableName() tableName: string,
	): Promise<PureCrudRowResponseDs> {
		const primaryKey = await this.extractPrimaryKeyFromQuery(userId, connectionId, tableName, query, masterPwd);
		if (!connectionId || isObjectEmpty(primaryKey)) {
			throw new HttpException({ message: Messages.PARAMETER_MISSING }, HttpStatus.BAD_REQUEST);
		}
		const inputData: PureReadRowDs = {
			connectionId,
			masterPwd,
			primaryKey,
			tableName,
			userId,
		};
		return await this.pureReadRowFromTableUseCase.execute(inputData, InTransactionEnum.OFF);
	}

	@ApiOperation({
		summary: 'Update a single row in a table by primary key. API+',
		description: 'Update a row by primary key and return only the updated row. Support access with api key.',
	})
	@ApiBody({ type: Object })
	@ApiResponse({ status: 200, description: 'Row updated.', type: PureCrudRowResponseDs })
	@ApiQuery({ name: 'tableName', required: true })
	@UseGuards(TableEditGuard)
	@Put('/table/crud/:connectionId')
	async updateRow(
		@Body() body: Record<string, unknown>,
		@Query() query: Record<string, string>,
		@MasterPassword() masterPwd: string,
		@SlugUuid('connectionId') connectionId: string,
		@UserId() userId: string,
		@QueryTableName() tableName: string,
	): Promise<PureCrudRowResponseDs> {
		if (!connectionId || isObjectEmpty(body)) {
			throw new HttpException({ message: Messages.PARAMETER_MISSING }, HttpStatus.BAD_REQUEST);
		}
		const primaryKey = await this.extractPrimaryKeyFromQuery(userId, connectionId, tableName, query, masterPwd);
		if (isObjectEmpty(primaryKey)) {
			throw new HttpException({ message: Messages.PARAMETER_MISSING }, HttpStatus.BAD_REQUEST);
		}
		const inputData: PureUpdateRowDs = {
			connectionId,
			masterPwd,
			primaryKey,
			row: body,
			tableName,
			userId,
		};
		return await this.pureUpdateRowInTableUseCase.execute(inputData, InTransactionEnum.OFF);
	}

	@ApiOperation({
		summary: 'Delete a single row from a table by primary key. API+',
		description: 'Delete a row by primary key and return only the deleted row. Support access with api key.',
	})
	@ApiResponse({ status: 200, description: 'Row deleted.', type: PureCrudRowResponseDs })
	@ApiQuery({ name: 'tableName', required: true })
	@UseGuards(TableDeleteGuard)
	@Delete('/table/crud/:connectionId')
	async deleteRow(
		@Query() query: Record<string, string>,
		@MasterPassword() masterPwd: string,
		@SlugUuid('connectionId') connectionId: string,
		@UserId() userId: string,
		@QueryTableName() tableName: string,
	): Promise<PureCrudRowResponseDs> {
		const primaryKey = await this.extractPrimaryKeyFromQuery(userId, connectionId, tableName, query, masterPwd);
		if (!connectionId || isObjectEmpty(primaryKey)) {
			throw new HttpException({ message: Messages.PARAMETER_MISSING }, HttpStatus.BAD_REQUEST);
		}
		const inputData: PureDeleteRowDs = {
			connectionId,
			masterPwd,
			primaryKey,
			tableName,
			userId,
		};
		return await this.pureDeleteRowFromTableUseCase.execute(inputData, InTransactionEnum.OFF);
	}

	private async extractPrimaryKeyFromQuery(
		userId: string,
		connectionId: string,
		tableName: string,
		query: Record<string, string>,
		masterPwd: string,
	): Promise<Record<string, unknown>> {
		const connection = await this._dbContext.connectionRepository.findAndDecryptConnection(connectionId, masterPwd);
		if (!connection) {
			throw new ConnectionNotFoundException(HttpStatus.BAD_REQUEST);
		}
		let userEmail = '';
		if (isConnectionTypeAgent(connection.type)) {
			userEmail = (await this._dbContext.userRepository.getUserEmailOrReturnNull(userId)) ?? '';
		}
		const dao = getDataAccessObject(connection);

		const tablesInConnection = await dao.getTablesFromDB(userEmail);
		const tableNames = tablesInConnection.map((table) => table.tableName);
		if (!tableNames.includes(tableName)) {
			throw new HttpException({ message: Messages.TABLE_NOT_FOUND }, HttpStatus.BAD_REQUEST);
		}

		const primaryColumns = await dao.getTablePrimaryColumns(tableName, userEmail);
		const primaryKey: Record<string, unknown> = {};
		for (const primaryColumn of primaryColumns) {
			if (isObjectPropertyExists(primaryColumn, 'column_name')) {
				primaryKey[primaryColumn.column_name] = query[primaryColumn.column_name];
			}
		}
		return primaryKey;
	}
}
