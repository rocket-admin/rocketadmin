import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Injectable,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UseCaseType } from '../../common/data-injection.tokens.js';
import { MasterPassword } from '../../decorators/master-password.decorator.js';
import { QueryTableName } from '../../decorators/query-table-name.decorator.js';
import { SlugUuid } from '../../decorators/slug-uuid.decorator.js';
import { InTransactionEnum } from '../../enums/in-transaction.enum.js';
import { Messages } from '../../exceptions/text/messages.js';
import { ConnectionEditGuard } from '../../guards/connection-edit.guard.js';
import { ConnectionReadGuard } from '../../guards/connection-read.guard.js';
import { SentryInterceptor } from '../../interceptors/index.js';
import { SuccessResponse } from '../../microservices/saas-microservice/data-structures/common-responce.ds.js';
import { CreateTableFilterDs } from './application/data-structures/create-table-filters.ds.js';
import { FindTableFilterByIdDs, FindTableFiltersDs } from './application/data-structures/find-table-filters.ds.js';
import { CreateTableFilterDto } from './application/response-objects/create-table-filters.dto.js';
import { CreatedTableFilterRO } from './application/response-objects/created-table-filters.ro.js';
import {
  ICreateTableFilters,
  IDeleteTableFilterById,
  IDeleteTableFilters,
  IFindTableFilterById,
  IFindTableFilters,
} from './use-cases/table-filters-use-cases.interface.js';

@UseInterceptors(SentryInterceptor)
@Controller('table-filters')
@ApiBearerAuth()
@ApiTags('Table filters')
@Injectable()
export class TableFiltersController {
  constructor(
    @Inject(UseCaseType.CREATE_TABLE_FILTERS)
    private readonly createTableFiltersUseCase: ICreateTableFilters,
    @Inject(UseCaseType.FIND_TABLE_FILTERS)
    private readonly findTableFiltersUseCase: IFindTableFilters,
    @Inject(UseCaseType.DELETE_TABLE_FILTERS)
    private readonly deleteTableFiltersUseCase: IDeleteTableFilters,
    @Inject(UseCaseType.FIND_TABLE_FILTER_BY_ID)
    private readonly findTableFilterByIdUseCase: IFindTableFilterById,
    @Inject(UseCaseType.DELETE_TABLE_FILTER_BY_ID)
    private readonly deleteTableFilterByIdUseCase: IDeleteTableFilterById,
  ) {}

  @ApiOperation({ summary: 'Add new table filters object' })
  @ApiBody({ type: CreateTableFilterDto })
  @ApiResponse({
    status: 201,
    description: 'Table filters created.',
    type: CreatedTableFilterRO,
  })
  @ApiQuery({ name: 'tableName', required: true })
  @ApiParam({ name: 'connectionId', required: true })
  @UseGuards(ConnectionEditGuard)
  @Post('/:connectionId')
  async addTableFilters(
    @QueryTableName() tableName: string,
    @Body() body: CreateTableFilterDto,
    @SlugUuid('connectionId') connectionId: string,
    @MasterPassword() masterPwd: string,
  ): Promise<CreatedTableFilterRO> {
    if (!tableName) {
      throw new BadRequestException(Messages.TABLE_NAME_MISSING);
    }
    if (!body.filters) {
      throw new BadRequestException(Messages.FILTERS_MISSING);
    }
    const inputData: CreateTableFilterDs = {
      table_name: tableName,
      connection_id: connectionId,
      filters: body.filters,
      masterPwd: masterPwd,
      filter_name: body.name,
      dynamic_filtered_column: body.dynamic_column ?? null,
    };
    return await this.createTableFiltersUseCase.execute(inputData, InTransactionEnum.ON);
  }

  @ApiOperation({ summary: 'Find all table filters' })
  @ApiResponse({
    status: 200,
    description: 'Table filters found.',
    type: CreatedTableFilterRO,
    isArray: true,
  })
  @ApiQuery({ name: 'tableName', required: true })
  @ApiParam({ name: 'connectionId', required: true })
  @UseGuards(ConnectionReadGuard)
  @Get('/:connectionId/all')
  async findTableFilters(
    @QueryTableName() tableName: string,
    @SlugUuid('connectionId') connectionId: string,
  ): Promise<Array<CreatedTableFilterRO>> {
    if (!tableName) {
      throw new BadRequestException(Messages.TABLE_NAME_MISSING);
    }
    const inputData: FindTableFiltersDs = {
      table_name: tableName,
      connection_id: connectionId,
    };
    return await this.findTableFiltersUseCase.execute(inputData, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Find table filter set by id' })
  @ApiResponse({
    status: 200,
    description: 'Table filter found.',
    type: CreatedTableFilterRO,
    isArray: true,
  })
  @ApiParam({ name: 'connectionId', required: true })
  @ApiParam({ name: 'filterId', required: true })
  @UseGuards(ConnectionReadGuard)
  @Get('/:connectionId/:filterId')
  async findTableFilterById(
    @SlugUuid('connectionId') connectionId: string,
    @SlugUuid('filterId') filterId: string,
  ): Promise<CreatedTableFilterRO> {
    const inputData: FindTableFilterByIdDs = {
      filter_id: filterId,
      connection_id: connectionId,
    };
    return await this.findTableFilterByIdUseCase.execute(inputData, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Delete table all filters for table' })
  @ApiResponse({
    status: 200,
    description: 'All table filters deleted.',
    type: SuccessResponse,
  })
  @ApiQuery({ name: 'tableName', required: true })
  @ApiParam({ name: 'connectionId', required: true })
  @UseGuards(ConnectionEditGuard)
  @Delete('/:connectionId/all')
  async deleteTableFilters(
    @QueryTableName() tableName: string,
    @SlugUuid('connectionId') connectionId: string,
  ): Promise<SuccessResponse> {
    if (!tableName) {
      throw new BadRequestException(Messages.TABLE_NAME_MISSING);
    }
    const inputData: FindTableFiltersDs = {
      table_name: tableName,
      connection_id: connectionId,
    };
    return await this.deleteTableFiltersUseCase.execute(inputData, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Delete filter set by id' })
  @ApiResponse({
    status: 200,
    description: 'Table filter set deleted.',
    type: SuccessResponse,
  })
  @ApiParam({ name: 'connectionId', required: true })
  @ApiParam({ name: 'filterId', required: true })
  @UseGuards(ConnectionEditGuard)
  @Delete('/:connectionId/:filterId')
  async deleteTableFiltersById(
    @SlugUuid('connectionId') connectionId: string,
    @SlugUuid('filterId') filterId: string,
  ): Promise<SuccessResponse> {
    const inputData: FindTableFilterByIdDs = {
      filter_id: filterId,
      connection_id: connectionId,
    };
    return await this.deleteTableFilterByIdUseCase.execute(inputData, InTransactionEnum.ON);
  }
}
