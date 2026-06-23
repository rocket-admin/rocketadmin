import {
	Body,
	Controller,
	HttpCode,
	HttpStatus,
	Inject,
	Injectable,
	Post,
	UseGuards,
	UseInterceptors,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UseCaseType } from '../../common/data-injection.tokens.js';
import { SlugUuid } from '../../decorators/slug-uuid.decorator.js';
import { Timeout, TimeoutDefaults } from '../../decorators/timeout.decorator.js';
import { PureCreateRowDs } from '../../entities/table/table-pure-crud-operations/application/data-structures/pure-create-row.ds.js';
import { PureCrudRowResponseDs } from '../../entities/table/table-pure-crud-operations/application/data-structures/pure-crud-row-response.ds.js';
import { PureDeleteRowDs } from '../../entities/table/table-pure-crud-operations/application/data-structures/pure-delete-row.ds.js';
import { PureFoundRowsResponseDs } from '../../entities/table/table-pure-crud-operations/application/data-structures/pure-found-rows-response.ds.js';
import { PureGetRowsDs } from '../../entities/table/table-pure-crud-operations/application/data-structures/pure-get-rows.ds.js';
import { PureReadRowDs } from '../../entities/table/table-pure-crud-operations/application/data-structures/pure-read-row.ds.js';
import { PureUpdateRowDs } from '../../entities/table/table-pure-crud-operations/application/data-structures/pure-update-row.ds.js';
import {
	IPureCreateRowInTable,
	IPureDeleteRowFromTable,
	IPureGetRowsFromTable,
	IPureReadRowFromTable,
	IPureUpdateRowInTable,
} from '../../entities/table/table-pure-crud-operations/use-cases/table-pure-crud-use-cases.interface.js';
import { InTransactionEnum } from '../../enums/in-transaction.enum.js';
import { isTest } from '../../helpers/app/is-test.js';
import { SentryInterceptor } from '../../interceptors/sentry.interceptor.js';
import {
	SitenovaEndUserAuthResponseDto,
	SitenovaLoginDto,
	SitenovaRegisterDto,
	SitenovaSiteCreateRowDto,
	SitenovaSiteGetRowsDto,
	SitenovaSiteRowByPrimaryKeyDto,
	SitenovaSiteUpdateRowDto,
} from './dto/sitenova-site.dtos.js';
import { SitenovaEndUserAuthGuard } from './guards/sitenova-enduser-auth.guard.js';
import { SitenovaPublicReadGuard } from './guards/sitenova-public-read.guard.js';
import { ISitenovaLoginEndUser, ISitenovaRegisterEndUser } from './use-cases/sitenova-site-use-cases.interface.js';

const DEFAULT_EMAIL_FIELD = 'email';
const DEFAULT_PASSWORD_FIELD = 'password';

@UseInterceptors(SentryInterceptor)
@Timeout()
@ApiTags('sitenova site')
@Controller('sitenova')
@Injectable()
export class SitenovaSiteController {
	constructor(
		@Inject(UseCaseType.SITENOVA_REGISTER_ENDUSER)
		private readonly registerEndUserUseCase: ISitenovaRegisterEndUser,
		@Inject(UseCaseType.SITENOVA_LOGIN_ENDUSER)
		private readonly loginEndUserUseCase: ISitenovaLoginEndUser,
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
	) {}

	@ApiOperation({ summary: 'Register a generated-site end-user (creates a row in the connection users table).' })
	@ApiResponse({ status: 201, type: SitenovaEndUserAuthResponseDto })
	@ApiBody({ type: SitenovaRegisterDto })
	@Throttle({ default: { limit: 30, ttl: 60000 } })
	@Post('/:connectionId/auth/register')
	public async register(
		@SlugUuid('connectionId') connectionId: string,
		@Body() body: SitenovaRegisterDto,
	): Promise<SitenovaEndUserAuthResponseDto> {
		return await this.registerEndUserUseCase.execute(
			{
				connectionId,
				tableName: body.tableName,
				email: body.email,
				password: body.password,
				emailField: body.emailField || DEFAULT_EMAIL_FIELD,
				passwordField: body.passwordField || DEFAULT_PASSWORD_FIELD,
				extra: body.extra ?? {},
			},
			InTransactionEnum.OFF,
		);
	}

	@ApiOperation({ summary: 'Log a generated-site end-user in and return a Bearer token.' })
	@ApiResponse({ status: 200, type: SitenovaEndUserAuthResponseDto })
	@ApiBody({ type: SitenovaLoginDto })
	@Throttle({ default: { limit: 30, ttl: 60000 } })
	@HttpCode(HttpStatus.OK)
	@Post('/:connectionId/auth/login')
	public async login(
		@SlugUuid('connectionId') connectionId: string,
		@Body() body: SitenovaLoginDto,
	): Promise<SitenovaEndUserAuthResponseDto> {
		return await this.loginEndUserUseCase.execute(
			{
				connectionId,
				tableName: body.tableName,
				email: body.email,
				password: body.password,
				emailField: body.emailField || DEFAULT_EMAIL_FIELD,
				passwordField: body.passwordField || DEFAULT_PASSWORD_FIELD,
			},
			InTransactionEnum.OFF,
		);
	}

	@ApiOperation({ summary: 'List rows (public-read; gated by the connection public policy).' })
	@ApiResponse({ status: 200, type: PureFoundRowsResponseDs })
	@ApiBody({ type: SitenovaSiteGetRowsDto })
	@UseGuards(SitenovaPublicReadGuard)
	@Timeout(!isTest() ? TimeoutDefaults.EXTENDED : TimeoutDefaults.EXTENDED_TEST)
	@HttpCode(HttpStatus.OK)
	@Post('/:connectionId/data/rows')
	public async getRows(
		@SlugUuid('connectionId') connectionId: string,
		@Body() body: SitenovaSiteGetRowsDto,
	): Promise<PureFoundRowsResponseDs> {
		const inputData: PureGetRowsDs = {
			connectionId,
			masterPwd: '',
			page: body.page ?? 0,
			perPage: body.perPage ?? 0,
			query: {},
			searchingFieldValue: body.search ?? '',
			tableName: body.tableName,
			userId: undefined,
			filters: body.filters,
		};
		return await this.pureGetRowsFromTableUseCase.execute(inputData, InTransactionEnum.OFF);
	}

	@ApiOperation({ summary: 'Read a row by primary key (public-read; gated by the connection public policy).' })
	@ApiResponse({ status: 200, type: PureCrudRowResponseDs })
	@ApiBody({ type: SitenovaSiteRowByPrimaryKeyDto })
	@UseGuards(SitenovaPublicReadGuard)
	@HttpCode(HttpStatus.OK)
	@Post('/:connectionId/data/read')
	public async readRow(
		@SlugUuid('connectionId') connectionId: string,
		@Body() body: SitenovaSiteRowByPrimaryKeyDto,
	): Promise<PureCrudRowResponseDs> {
		const inputData: PureReadRowDs = {
			connectionId,
			masterPwd: '',
			primaryKey: body.primaryKey,
			tableName: body.tableName,
			userId: undefined,
		};
		return await this.pureReadRowFromTableUseCase.execute(inputData, InTransactionEnum.OFF);
	}

	@ApiOperation({ summary: 'Create a row (requires a valid end-user token).' })
	@ApiResponse({ status: 201, type: PureCrudRowResponseDs })
	@ApiBody({ type: SitenovaSiteCreateRowDto })
	@UseGuards(SitenovaEndUserAuthGuard)
	@Post('/:connectionId/data/create')
	public async createRow(
		@SlugUuid('connectionId') connectionId: string,
		@Body() body: SitenovaSiteCreateRowDto,
	): Promise<PureCrudRowResponseDs> {
		const inputData: PureCreateRowDs = {
			connectionId,
			masterPwd: '',
			row: body.row,
			tableName: body.tableName,
			userId: '',
		};
		return await this.pureCreateRowInTableUseCase.execute(inputData, InTransactionEnum.OFF);
	}

	@ApiOperation({ summary: 'Update a row by primary key (requires a valid end-user token).' })
	@ApiResponse({ status: 200, type: PureCrudRowResponseDs })
	@ApiBody({ type: SitenovaSiteUpdateRowDto })
	@UseGuards(SitenovaEndUserAuthGuard)
	@HttpCode(HttpStatus.OK)
	@Post('/:connectionId/data/update')
	public async updateRow(
		@SlugUuid('connectionId') connectionId: string,
		@Body() body: SitenovaSiteUpdateRowDto,
	): Promise<PureCrudRowResponseDs> {
		const inputData: PureUpdateRowDs = {
			connectionId,
			masterPwd: '',
			primaryKey: body.primaryKey,
			row: body.row,
			tableName: body.tableName,
			userId: '',
		};
		return await this.pureUpdateRowInTableUseCase.execute(inputData, InTransactionEnum.OFF);
	}

	@ApiOperation({ summary: 'Delete a row by primary key (requires a valid end-user token).' })
	@ApiResponse({ status: 200, type: PureCrudRowResponseDs })
	@ApiBody({ type: SitenovaSiteRowByPrimaryKeyDto })
	@UseGuards(SitenovaEndUserAuthGuard)
	@HttpCode(HttpStatus.OK)
	@Post('/:connectionId/data/delete')
	public async deleteRow(
		@SlugUuid('connectionId') connectionId: string,
		@Body() body: SitenovaSiteRowByPrimaryKeyDto,
	): Promise<PureCrudRowResponseDs> {
		const inputData: PureDeleteRowDs = {
			connectionId,
			masterPwd: '',
			primaryKey: body.primaryKey,
			tableName: body.tableName,
			userId: '',
		};
		return await this.pureDeleteRowFromTableUseCase.execute(inputData, InTransactionEnum.OFF);
	}
}
