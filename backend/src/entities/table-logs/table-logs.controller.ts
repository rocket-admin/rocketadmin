import {
  Controller,
  Get,
  HttpStatus,
  Inject,
  Injectable,
  ParseArrayPipe,
  Query,
  StreamableFile,
  UseInterceptors,
} from '@nestjs/common';
import { HttpException } from '@nestjs/common/exceptions/http.exception.js';
import { UseCaseType } from '../../common/data-injection.tokens.js';
import { SlugUuid, UserId } from '../../decorators/index.js';
import { InTransactionEnum, LogOperationTypeEnum } from '../../enums/index.js';
import { Messages } from '../../exceptions/text/messages.js';
import { SentryInterceptor } from '../../interceptors/index.js';
import { FindLogsDs } from './application/data-structures/find-logs.ds.js';
import { FoundLogsDs } from './application/data-structures/found-logs.ds.js';
import { IExportLogsAsCsv, IFindLogs } from './use-cases/use-cases.interface.js';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

@UseInterceptors(SentryInterceptor)
@Controller()
@ApiBearerAuth()
@ApiTags('table logs')
@Injectable()
export class TableLogsController {
  constructor(
    @Inject(UseCaseType.FIND_LOGS)
    private readonly findLogsUseCase: IFindLogs,
    @Inject(UseCaseType.EXPORT_LOGS_AS_CSV)
    private readonly exportLogsAsCsvUseCase: IExportLogsAsCsv,
  ) {}

  @ApiOperation({
    summary: `Get all connection logs.
  In query you can pass:
  tableName=value |
  order=ASC (sorting by time when  record was created at) |
  page=value &
  perPage=value |
  dateFrom=value &
  dateTo=value (to get logs between two dates) |
  email=value |
  limit=value (if you do not want use pagination. default limit is 500) 
  `,
  })
  @ApiResponse({
    status: 200,
    description: 'Return all table logs.',
    type: FoundLogsDs,
  })
  @ApiQuery({ name: 'tableName', required: false })
  @ApiQuery({ name: 'order', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'perPage', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'email', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'operationTypes', required: false, isArray: true })
  @ApiQuery({ name: 'affected_primary_key', required: false })
  @Get('/logs/:connectionId')
  async findAll(
    @Query() query,
    @SlugUuid('connectionId') connectionId: string,
    @UserId() userId: string,
    @Query('operationTypes', new ParseArrayPipe({ separator: ',', optional: true }))
    operationTypes: Array<LogOperationTypeEnum>,
  ): Promise<FoundLogsDs> {
    if (!connectionId) {
      throw new HttpException(
        {
          message: Messages.PARAMETER_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const inputData: FindLogsDs = {
      connectionId: connectionId,
      query: query,
      userId: userId,
      operationTypes: operationTypes ? operationTypes : [],
    };
    return await this.findLogsUseCase.execute(inputData, InTransactionEnum.OFF);
  }

  @ApiOperation({
    summary: `Export connection logs as csv file.
  In query you can pass:
  tableName=value |
  order=ASC (sorting by time when  record was created at) |
  page=value &
  perPage=value |
  dateFrom=value &
  dateTo=value (to get logs between two dates) |
  email=value |
  limit=value (if you do not want use pagination. default limit is 500) 
  `,
  })
  @ApiResponse({
    status: 200,
    description: 'Export table logs as CSV.',
  })
  @ApiQuery({ name: 'tableName', required: false })
  @ApiQuery({ name: 'order', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'perPage', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'email', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'operationTypes', required: false, isArray: true })
  @ApiQuery({ name: 'affected_primary_key', required: false })
  @Get('/logs/export/:connectionId')
  async exportLogsAsCSV(
    @Query() query,
    @SlugUuid('connectionId') connectionId: string,
    @UserId() userId: string,
    @Query('operationTypes', new ParseArrayPipe({ separator: ',', optional: true }))
    operationTypes: Array<LogOperationTypeEnum>,
  ): Promise<StreamableFile> {
    if (!connectionId) {
      throw new HttpException(
        {
          message: Messages.PARAMETER_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const inputData: FindLogsDs = {
      connectionId: connectionId,
      query: query,
      userId: userId,
      operationTypes: operationTypes ? operationTypes : [],
    };
    return await this.exportLogsAsCsvUseCase.execute(inputData);
  }
}
