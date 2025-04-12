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
import { FindAllRowsWithBodyFiltersDto } from '../table/dto/find-rows-with-body-filters.dto.js';
import { CreateTableFiltersDto } from './application/data-structures/create-table-filters.ds.js';
import { FindTableFiltersDs } from './application/data-structures/find-table-filters.ds.js';
import { CreatedTableFiltersRO } from './application/response-objects/created-table-filters.ro.js';
import {
  ICreateTableFilters,
  IDeleteTableFilters,
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
  ) {}

  @ApiOperation({ summary: 'Add new table filters' })
  @ApiBody({ type: FindAllRowsWithBodyFiltersDto })
  @ApiResponse({
    status: 201,
    description: 'Table filters created.',
    type: CreatedTableFiltersRO,
  })
  @ApiQuery({ name: 'tableName', required: true })
  @ApiParam({ name: 'connectionId', required: true })
  @UseGuards(ConnectionEditGuard)
  @Post('/:connectionId')
  async addTableFilters(
    @QueryTableName() tableName: string,
    @Body() body: FindAllRowsWithBodyFiltersDto,
    @SlugUuid('connectionId') connectionId: string,
    @MasterPassword() masterPwd: string,
  ): Promise<CreatedTableFiltersRO> {
    if (!tableName) {
      throw new BadRequestException(Messages.TABLE_NAME_MISSING);
    }
    if (!body.filters) {
      throw new BadRequestException(Messages.FILTERS_MISSING);
    }
    const inputData: CreateTableFiltersDto = {
      table_name: tableName,
      connection_id: connectionId,
      filters: body.filters,
      masterPwd: masterPwd,
    };
    return await this.createTableFiltersUseCase.execute(inputData, InTransactionEnum.ON);
  }

  @ApiOperation({ summary: 'Find table filters' })
  @ApiBody({ type: FindAllRowsWithBodyFiltersDto })
  @ApiResponse({
    status: 200,
    description: 'Table filters found.',
    type: CreatedTableFiltersRO,
  })
  @ApiQuery({ name: 'tableName', required: true })
  @ApiParam({ name: 'connectionId', required: true })
  @UseGuards(ConnectionReadGuard)
  @Get('/:connectionId')
  async findTableFilters(
    @QueryTableName() tableName: string,
    @SlugUuid('connectionId') connectionId: string,
  ): Promise<CreatedTableFiltersRO> {
    if (!tableName) {
      throw new BadRequestException(Messages.TABLE_NAME_MISSING);
    }
    const inputData: FindTableFiltersDs = {
      table_name: tableName,
      connection_id: connectionId,
    };
    return await this.findTableFiltersUseCase.execute(inputData, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Delete table filters' })
  @ApiBody({ type: FindAllRowsWithBodyFiltersDto })
  @ApiResponse({
    status: 200,
    description: 'Table filters Deleted.',
    type: CreatedTableFiltersRO,
  })
  @ApiQuery({ name: 'tableName', required: true })
  @ApiParam({ name: 'connectionId', required: true })
  @UseGuards(ConnectionEditGuard)
  @Delete('/:connectionId')
  async deleteTableFilters(
    @QueryTableName() tableName: string,
    @SlugUuid('connectionId') connectionId: string,
  ): Promise<CreatedTableFiltersRO> {
    if (!tableName) {
      throw new BadRequestException(Messages.TABLE_NAME_MISSING);
    }
    const inputData: FindTableFiltersDs = {
      table_name: tableName,
      connection_id: connectionId,
    };
    return await this.deleteTableFiltersUseCase.execute(inputData, InTransactionEnum.OFF);
  }
}
