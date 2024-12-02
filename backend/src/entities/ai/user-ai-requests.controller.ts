import { UseInterceptors, Controller, Injectable, Inject, UseGuards, Post, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SentryInterceptor } from '../../interceptors/sentry.interceptor.js';
import { UseCaseType } from '../../common/data-injection.tokens.js';
import { IRequestInfoFromTable } from './ai-use-cases.interface.js';
import { TableReadGuard } from '../../guards/table-read.guard.js';
import { RequestInfoFromTableBodyDTO } from './application/dto/request-info-from-table-body.dto.js';
import { SlugUuid } from '../../decorators/slug-uuid.decorator.js';
import { RequestInfoFromTableDS } from './application/data-structures/request-info-from-table.ds.js';
import { QueryTableName } from '../../decorators/query-table-name.decorator.js';
import { InTransactionEnum } from '../../enums/in-transaction.enum.js';
import { MasterPassword } from '../../decorators/master-password.decorator.js';
import { ResponseInfoDS } from './application/data-structures/response-info.ds.js';
import { UserId } from '../../decorators/user-id.decorator.js';

@UseInterceptors(SentryInterceptor)
@Controller()
@ApiBearerAuth()
@ApiTags('ai')
@Injectable()
export class UserAIRequestsController {
  constructor(
    @Inject(UseCaseType.REQUEST_INFO_FROM_TABLE_WITH_AI)
    private readonly requestInfoFromTableWithAIUseCase: IRequestInfoFromTable,
  ) {}

  @ApiOperation({ summary: 'Request info from table in connection with AI' })
  @ApiResponse({
    status: 201,
    description: 'Returned info.',
    type: ResponseInfoDS,
  })
  @UseGuards(TableReadGuard)
  @ApiBody({ type: RequestInfoFromTableBodyDTO })
  @ApiQuery({ name: 'tableName', required: true, type: String })
  @Post('/ai/request/:connectionId')
  public async requestInfoFromTableWithAI(
    @SlugUuid('connectionId') connectionId: string,
    @QueryTableName() tableName: string,
    @MasterPassword() masterPassword: string,
    @UserId() userId: string,
    @Body() requestData: RequestInfoFromTableBodyDTO,
  ): Promise<any> {
    const inputData: RequestInfoFromTableDS = {
      connectionId,
      tableName,
      user_message: requestData.user_message,
      master_password: masterPassword,
      user_id: userId,
    };
    return await this.requestInfoFromTableWithAIUseCase.execute(inputData, InTransactionEnum.OFF);
  }
}
