import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { LogOperationTypeEnum, QueryOrderingEnum } from '../../../enums/index.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { Constants } from '../../../helpers/constants/constants.js';
import { validateStringWithEnum } from '../../../helpers/validators/validate-string-with-enum.js';
import { FindLogsDs } from '../application/data-structures/find-logs.ds.js';
import { FoundLogsDs, FoundLogsEntities } from '../application/data-structures/found-logs.ds.js';
import { IFindLogsOptions } from '../repository/table-logs-repository.interface.js';
import { buildFoundLogRecordDs } from '../utils/build-found-log-record-ds.js';
import { IFindLogs } from './use-cases.interface.js';

@Injectable()
export class FindLogsUseCase extends AbstractUseCase<FindLogsDs, FoundLogsDs> implements IFindLogs {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: FindLogsDs): Promise<FoundLogsDs> {
    const { connectionId, query, userId, operationTypes } = inputData;
    const userConnectionEdit = await this._dbContext.userAccessRepository.checkUserConnectionEdit(userId, connectionId);
    const tableName = query['tableName'];
    let order = query['order'];
    let limit = query['limit'];
    let page = parseInt(query['page']);
    let perPage = parseInt(query['perPage']);
    const dateFrom = query['dateFrom'];
    const dateTo = query['dateTo'];
    const searchedEmail = query['email']?.toLowerCase();
    const searchedAffectedPrimaryKey: string = query['affected_primary_key'];
    const operationType: LogOperationTypeEnum = query['operationType'];
    if (operationType) {
      const actionValidationResult = validateStringWithEnum(operationType, LogOperationTypeEnum);
      if (!actionValidationResult) {
        throw new HttpException(
          {
            message: Messages.INCORRECT_TABLE_LOG_ACTION_TYPE,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    if (operationTypes.length > 0) {
      for (const operationTypeElement of operationTypes) {
        const actionValidationResult = validateStringWithEnum(operationTypeElement, LogOperationTypeEnum);
        if (!actionValidationResult) {
          throw new HttpException(
            {
              message: Messages.INCORRECT_TABLE_LOG_ACTION_TYPE,
            },
            HttpStatus.BAD_REQUEST,
          );
        }
      }
    }

    if (!order || order !== QueryOrderingEnum.ASC) {
      order = QueryOrderingEnum.DESC;
    }
    if (!limit) {
      limit = Constants.DEFAULT_LOG_ROWS_LIMIT;
    }
    if (!page || page <= 0) {
      page = 1;
    }
    if (!perPage || perPage <= 0) {
      perPage = limit;
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
    let userIdsInGroupsWhereUserIsAdmin: Array<string> = [];
    if (!userConnectionEdit) {
      const usersInGroupsWhereUserIsAdmin = await this._dbContext.groupRepository.findAllUsersInGroupsWhereUserIsAdmin(
        userId,
        connectionId,
      );
      userIdsInGroupsWhereUserIsAdmin = usersInGroupsWhereUserIsAdmin.map((user) => user.id);
    }

    const findOptions: IFindLogsOptions = {
      connectionId: connectionId,
      currentUserId: userId,
      dateFrom: searchedDateFrom,
      dateTo: searchedDateTo,
      order: order,
      page: page,
      perPage: perPage,
      searchedEmail: searchedEmail,
      tableName: tableName ? tableName : null,
      userConnectionEdit: userConnectionEdit,
      userInGroupsIds: userIdsInGroupsWhereUserIsAdmin,
      logOperationType: operationType,
      logOperationTypes: operationTypes,
      searchedAffectedPrimaryKey: searchedAffectedPrimaryKey,
    };
    const { logs, pagination }: FoundLogsEntities = await this._dbContext.tableLogsRepository.findLogs(findOptions);
    return {
      logs: logs.map((log) => {
        return buildFoundLogRecordDs(log);
      }),
      pagination: pagination,
    };
  }
}
