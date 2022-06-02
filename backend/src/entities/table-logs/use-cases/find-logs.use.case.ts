import { Inject, Injectable, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case';
import { FoundLogsDs, FoundLogsEntities } from '../application/data-structures/found-logs.ds';
import { FindLogsDs } from '../application/data-structures/find-logs.ds';
import { IFindLogs } from './use-cases.interface';
import { BaseType } from '../../../common/data-injection.tokens';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { QueryOrderingEnum } from '../../../enums';
import { Constants } from '../../../helpers/constants/constants';
import { IFindLogsOptions } from '../repository/table-logs-repository.interface';
import { buildFoundLogRecordDs } from '../utils/build-found-log-record-ds';

@Injectable({ scope: Scope.REQUEST })
export class FindLogsUseCase extends AbstractUseCase<FindLogsDs, FoundLogsDs> implements IFindLogs {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: FindLogsDs): Promise<FoundLogsDs> {
    const { connectionId, query, userId } = inputData;
    const userConnectionEdit = await this._dbContext.userAccessRepository.checkUserConnectionEdit(userId, connectionId);
    const tableName = query['tableName'];
    let order = query['order'];
    let limit = query['limit'];
    let page = parseInt(query['page']);
    let perPage = parseInt(query['perPage']);
    const dateFrom = query['dateFrom'];
    const dateTo = query['dateTo'];
    const searchedEmail = query['email'];

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
