import { Body, Controller, Inject, Injectable, Post, Res, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { UseCaseType } from '../../common/data-injection.tokens.js';
import { MasterPassword } from '../../decorators/master-password.decorator.js';
import { QueryTableName } from '../../decorators/query-table-name.decorator.js';
import { SlugUuid } from '../../decorators/slug-uuid.decorator.js';
import { UserId } from '../../decorators/user-id.decorator.js';
import { InTransactionEnum } from '../../enums/in-transaction.enum.js';
import { TableReadGuard } from '../../guards/table-read.guard.js';
import { SentryInterceptor } from '../../interceptors/sentry.interceptor.js';
import { IRequestInfoFromTableV2 } from './ai-use-cases.interface.js';
import { RequestInfoFromTableDSV2 } from './application/data-structures/request-info-from-table.ds.js';
import { RequestInfoFromTableBodyDTO } from './application/dto/request-info-from-table-body.dto.js';

@UseInterceptors(SentryInterceptor)
@Controller()
@ApiBearerAuth()
@ApiTags('ai v2')
@Injectable()
export class UserAIRequestsControllerV2 {
  constructor(
    @Inject(UseCaseType.REQUEST_INFO_FROM_TABLE_WITH_AI_V2)
    private readonly requestInfoFromTableWithAIUseCase: IRequestInfoFromTableV2,
  ) {}

  @ApiOperation({ summary: 'Request info from table in connection with AI (Version 2)' })
  @ApiResponse({
    status: 201,
    description: 'Returned info.',
  })
  @UseGuards(TableReadGuard)
  @ApiBody({ type: RequestInfoFromTableBodyDTO })
  @ApiQuery({ name: 'tableName', required: true, type: String })
  @Post('/ai/v2/request/:connectionId')
  public async requestInfoFromTableWithAI(
    @SlugUuid('connectionId') connectionId: string,
    @QueryTableName() tableName: string,
    @MasterPassword() masterPassword: string,
    @UserId() userId: string,
    @Body() requestData: RequestInfoFromTableBodyDTO,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const inputData: RequestInfoFromTableDSV2 = {
      connectionId,
      tableName,
      user_message: requestData.user_message,
      master_password: masterPassword,
      user_id: userId,
      response,
    };
    return await this.requestInfoFromTableWithAIUseCase.execute(inputData, InTransactionEnum.OFF);
  }
}
