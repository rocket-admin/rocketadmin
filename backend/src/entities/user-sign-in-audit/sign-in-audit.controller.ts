import { Controller, Get, Inject, Injectable, Query, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UseCaseType } from '../../common/data-injection.tokens.js';
import { UserId } from '../../decorators/index.js';
import { InTransactionEnum } from '../../enums/index.js';
import { SentryInterceptor } from '../../interceptors/index.js';
import { FindSignInAuditLogsDs } from './dto/find-sign-in-audit-logs.ds.js';
import { FoundSignInAuditLogsDs } from './dto/found-sign-in-audit-logs.ds.js';
import { SignInMethodEnum } from './enums/sign-in-method.enum.js';
import { SignInStatusEnum } from './enums/sign-in-status.enum.js';
import { IFindSignInAuditLogs } from './use-cases/use-cases.interface.js';

@UseInterceptors(SentryInterceptor)
@Controller()
@ApiBearerAuth()
@ApiTags('Sign In Audit')
@Injectable()
export class SignInAuditController {
  constructor(
    @Inject(UseCaseType.FIND_SIGN_IN_AUDIT_LOGS)
    private readonly findSignInAuditLogsUseCase: IFindSignInAuditLogs,
  ) {}

  @ApiOperation({
    summary: 'Find sign-in audit logs for the company.',
    description: `
      You can provide the following query parameters:
      - \`order=ASC|DESC\`: Sorting order by creation time.
      - \`page=value\`: Page number for pagination.
      - \`perPage=value\`: Number of records per page.
      - \`dateFrom=value\`: Start date to filter logs.
      - \`dateTo=value\`: End date to filter logs.
      - \`email=value\`: Filter logs by email.
      - \`status=value\`: Filter by sign-in status (success, failed, blocked).
      - \`signInMethod=value\`: Filter by sign-in method (email, google, github, saml, otp).
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Sign-in audit logs found.',
    type: FoundSignInAuditLogsDs,
  })
  @ApiQuery({ name: 'companyId', required: true })
  @ApiQuery({ name: 'order', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'perPage', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'email', required: false })
  @ApiQuery({ name: 'status', required: false, enum: SignInStatusEnum })
  @ApiQuery({ name: 'signInMethod', required: false, enum: SignInMethodEnum })
  @Get('/sign-in-audit/logs')
  async findSignInAuditLogs(
    @Query() query: any,
    @Query('companyId') companyId: string,
    @UserId() userId: string,
  ): Promise<FoundSignInAuditLogsDs> {
    const inputData: FindSignInAuditLogsDs = {
      userId,
      companyId,
      query: {
        order: query.order,
        page: parseInt(query.page) || 1,
        perPage: parseInt(query.perPage) || 50,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
        email: query.email,
        status: query.status,
        signInMethod: query.signInMethod,
      },
    };
    return await this.findSignInAuditLogsUseCase.execute(inputData, InTransactionEnum.OFF);
  }
}
