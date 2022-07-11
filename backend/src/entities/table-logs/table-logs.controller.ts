import {
  Controller,
  Get,
  HttpStatus,
  Inject,
  Injectable,
  Param,
  Query,
  Req,
  Scope,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { getCognitoUserName } from '../../helpers';
import { HttpException } from '@nestjs/common/exceptions/http.exception';
import { IRequestWithCognitoInfo } from '../../authorization';
import { Messages } from '../../exceptions/text/messages';
import { SentryInterceptor } from '../../interceptors';
import { UseCaseType } from '../../common/data-injection.tokens';
import { IFindLogs } from './use-cases/use-cases.interface';
import { FoundLogsDs } from './application/data-structures/found-logs.ds';
import { FindLogsDs } from './application/data-structures/find-logs.ds';

@ApiBearerAuth()
@ApiTags('logs')
@UseInterceptors(SentryInterceptor)
@Controller()
@Injectable({ scope: Scope.REQUEST })
export class TableLogsController {
  constructor(
    @Inject(UseCaseType.FIND_LOGS)
    private readonly findLogsUseCase: IFindLogs,
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
  @ApiResponse({ status: 200, description: 'Return all table logs.' })
  @Get('/logs/:slug')
  async findAll(@Req() request: IRequestWithCognitoInfo, @Param() params, @Query() query): Promise<FoundLogsDs> {
    const cognitoUserName = getCognitoUserName(request);
    const connectionId = params.slug;
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
      userId: cognitoUserName,
    };
    return await this.findLogsUseCase.execute(inputData);
  }
}
