import {
  BadRequestException,
  Body,
  Controller,
  Inject,
  Injectable,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SentryInterceptor } from '../../interceptors/index.js';
import { ConnectionEditGuard } from '../../guards/connection-edit.guard.js';
import { FindAllRowsWithBodyFiltersDto } from '../table/dto/find-rows-with-body-filters.dto.js';
import { QueryTableName } from '../../decorators/query-table-name.decorator.js';
import { UseCaseType } from '../../common/data-injection.tokens.js';
import { ICreateTableFilters } from './use-cases/table-filters-use-cases.interface.js';
import { CreatedTableFiltersRO } from './application/response-objects/created-table-filters.ro.js';
import { Messages } from '../../exceptions/text/messages.js';
import { SlugUuid } from '../../decorators/slug-uuid.decorator.js';
import { CreateTableFiltersDto } from './application/data-structures/create-table-filters.ds.js';
import { InTransactionEnum } from '../../enums/in-transaction.enum.js';
import { MasterPassword } from '../../decorators/master-password.decorator.js';

@UseInterceptors(SentryInterceptor)
@Controller('table-filters')
@ApiBearerAuth()
@ApiTags('Table filters')
@Injectable()
export class TableFiltersController {
  constructor(
    @Inject(UseCaseType.CREATE_TABLE_FILTERS)
    private readonly createTableFiltersUseCase: ICreateTableFilters,
  ) {}

  @ApiOperation({ summary: 'Add new table filters' })
  @ApiBody({ type: FindAllRowsWithBodyFiltersDto })
  @ApiResponse({
    status: 201,
    description: 'Table settings created.',
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
    const inputData: CreateTableFiltersDto = {
      table_name: tableName,
      connection_id: connectionId,
      filters: body.filters,
      masterPwd: masterPwd,
    };
    return await this.createTableFiltersUseCase.execute(inputData, InTransactionEnum.ON);
  }
}
