import { Body, Controller, Get, Inject, Injectable, Put, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UseCaseType } from '../../common/data-injection.tokens.js';
import { MasterPassword } from '../../decorators/master-password.decorator.js';
import { SlugUuid } from '../../decorators/slug-uuid.decorator.js';
import { Timeout } from '../../decorators/timeout.decorator.js';
import { InTransactionEnum } from '../../enums/in-transaction.enum.js';
import { ConnectionEditGuard } from '../../guards/connection-edit.guard.js';
import { TablesReceiveGuard } from '../../guards/tables-receive.guard.js';
import { SentryInterceptor } from '../../interceptors/sentry.interceptor.js';
import { CreateOrUpdateTableCategoriesDS } from './data-sctructures/create-or-update-table-categories.ds.js';
import { CreateTableCategoryDto } from './dto/create-table-category.dto.js';
import { FoundTableCategoryRo } from './dto/found-table-category.ro.js';
import {
	ICreateTableCategories,
	IFindTableCategories,
	IFindTableCategoriesWithTables,
} from './use-cases/table-categories-use-cases.interface.js';
import { FoundTableCategoriesWithTablesRo } from './dto/found-table-categories-with-tables.ro.js';
import { UserId } from '../../decorators/user-id.decorator.js';
import { FindTablesDs } from '../table/application/data-structures/find-tables.ds.js';

@UseInterceptors(SentryInterceptor)
@Timeout()
@Controller('table-categories')
@ApiBearerAuth()
@ApiTags('Table categories')
@Injectable()
export class TableCategoriesController {
	constructor(
		@Inject(UseCaseType.CREATE_UPDATE_TABLE_CATEGORIES)
		private readonly createTableCategoriesUseCase: ICreateTableCategories,
		@Inject(UseCaseType.FIND_TABLE_CATEGORIES)
		private readonly findTableCategoriesUseCase: IFindTableCategories,
		@Inject(UseCaseType.FIND_TABLE_CATEGORIES_WITH_TABLES)
		private readonly findTableCategoriesWithTablesUseCase: IFindTableCategoriesWithTables,
	) {}

	@ApiOperation({ summary: 'Add new table categories' })
	@ApiBody({ type: CreateTableCategoryDto, isArray: true })
	@ApiResponse({
		status: 200,
		description: 'Table categories created.',
		type: FoundTableCategoryRo,
		isArray: true,
	})
	@ApiParam({ name: 'connectionId', required: true })
	@UseGuards(ConnectionEditGuard)
	@Put('/:connectionId')
	async createTableCategories(
		@SlugUuid('connectionId') connectionId: string,
		@MasterPassword() masterPwd: string,
		@Body() requestBody: CreateTableCategoryDto[],
	): Promise<Array<FoundTableCategoryRo>> {
		const inputData: CreateOrUpdateTableCategoriesDS = {
			connectionId,
			master_password: masterPwd,
			table_categories: requestBody,
		};
		return await this.createTableCategoriesUseCase.execute(inputData, InTransactionEnum.ON);
	}

	@ApiOperation({ summary: 'Find table categories' })
	@ApiResponse({
		status: 200,
		description: 'Table categories found.',
		type: FoundTableCategoryRo,
		isArray: true,
	})
	@ApiParam({ name: 'connectionId', required: true })
	@UseGuards(TablesReceiveGuard)
	@Get('/:connectionId')
	async findTableCategories(@SlugUuid('connectionId') connectionId: string): Promise<Array<FoundTableCategoryRo>> {
		return await this.findTableCategoriesUseCase.execute(connectionId);
	}

	@ApiOperation({ summary: 'Find table categories with tables' })
	@ApiResponse({
		status: 200,
		description: 'Table categories with tables found.',
		type: FoundTableCategoriesWithTablesRo,
		isArray: true,
	})
	@ApiParam({ name: 'connectionId', required: true })
	@UseGuards(TablesReceiveGuard)
	@Get('/v2/:connectionId')
	async findTableCategoriesWithTAbles(
		@SlugUuid('connectionId') connectionId: string,
		@UserId() userId: string,
		@MasterPassword() masterPwd: string,
	): Promise<Array<FoundTableCategoriesWithTablesRo>> {
		const inputData: FindTablesDs = {
			connectionId: connectionId,
			hiddenTablesOption: false,
			masterPwd: masterPwd,
			userId: userId,
		};
		return await this.findTableCategoriesWithTablesUseCase.execute(inputData);
	}
}
