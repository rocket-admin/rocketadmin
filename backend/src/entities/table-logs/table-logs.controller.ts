import {
  Controller,
  Get,
  HttpStatus,
  Inject,
  Injectable,
  ParseArrayPipe,
  Query,
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
import { IFindLogs } from './use-cases/use-cases.interface.js';

@UseInterceptors(SentryInterceptor)
@Controller()
@Injectable()
export class TableLogsController {
  constructor(
    @Inject(UseCaseType.FIND_LOGS)
    private readonly findLogsUseCase: IFindLogs,
  ) {}

  @Get('/logs/:slug')
  async findAll(
    @Query() query,
    @SlugUuid() connectionId: string,
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
}
