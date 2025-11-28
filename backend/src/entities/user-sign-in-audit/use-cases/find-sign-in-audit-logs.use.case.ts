import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { QueryOrderingEnum } from '../../../enums/index.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { Constants } from '../../../helpers/constants/constants.js';
import { validateStringWithEnum } from '../../../helpers/validators/validate-string-with-enum.js';
import { FindSignInAuditLogsDs } from '../dto/find-sign-in-audit-logs.ds.js';
import { FoundSignInAuditLogsDs } from '../dto/found-sign-in-audit-logs.ds.js';
import { SignInMethodEnum } from '../enums/sign-in-method.enum.js';
import { SignInStatusEnum } from '../enums/sign-in-status.enum.js';
import { buildFoundSignInAuditRecordDs } from '../utils/build-found-sign-in-audit-record-ds.js';
import { IFindSignInAuditLogs } from './use-cases.interface.js';

@Injectable()
export class FindSignInAuditLogsUseCase
  extends AbstractUseCase<FindSignInAuditLogsDs, FoundSignInAuditLogsDs>
  implements IFindSignInAuditLogs
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: FindSignInAuditLogsDs): Promise<FoundSignInAuditLogsDs> {
    const { userId, companyId, query } = inputData;

    const user = await this._dbContext.userRepository.findOne({
      where: { id: userId },
      relations: ['company'],
    });

    if (!user || user.company?.id !== companyId) {
      throw new HttpException(
        {
          message: Messages.COMPANY_NOT_FOUND,
        },
        HttpStatus.FORBIDDEN,
      );
    }

    let order = query.order as QueryOrderingEnum;
    let page = query.page;
    let perPage = query.perPage;
    const dateFrom = query.dateFrom;
    const dateTo = query.dateTo;
    const searchedEmail = query.email?.toLowerCase();
    const status = query.status;
    const signInMethod = query.signInMethod;

    if (status) {
      const statusValidationResult = validateStringWithEnum(status, SignInStatusEnum);
      if (!statusValidationResult) {
        throw new HttpException(
          {
            message: Messages.INVALID_SIGN_IN_STATUS,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    if (signInMethod) {
      const methodValidationResult = validateStringWithEnum(signInMethod, SignInMethodEnum);
      if (!methodValidationResult) {
        throw new HttpException(
          {
            message: Messages.INVALID_SIGN_IN_METHOD,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    if (!order || order !== QueryOrderingEnum.ASC) {
      order = QueryOrderingEnum.DESC;
    }
    if (!page || page <= 0) {
      page = 1;
    }
    if (!perPage || perPage <= 0) {
      perPage = Constants.DEFAULT_LOG_ROWS_LIMIT;
    }

    let searchedDateFrom: Date = null;
    let searchedDateTo: Date = null;
    if (dateFrom && dateTo) {
      let dateFromParsed = Date.parse(dateFrom);
      let dateToParsed = Date.parse(dateTo);
      const dateFromMs = new Date(dateFromParsed).getTime();
      const dateToMs = new Date(dateToParsed).getTime();
      if (dateFromMs > dateToMs) {
        const tmpDate = dateFromParsed;
        dateFromParsed = dateToParsed;
        dateToParsed = tmpDate;
      }
      searchedDateFrom = new Date(dateFromParsed);
      searchedDateTo = new Date(dateToParsed);
    }

    const { logs, pagination } = await this._dbContext.signInAuditRepository.findSignInAuditLogs({
      companyId,
      order,
      page,
      perPage,
      dateFrom: searchedDateFrom,
      dateTo: searchedDateTo,
      searchedEmail,
      status,
      signInMethod,
      userId,
    });

    return {
      logs: logs.map((log) => buildFoundSignInAuditRecordDs(log)),
      pagination,
    };
  }
}
