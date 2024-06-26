import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../../common/abstract-use.case.js';
import { IGetTableActionV2 } from './table-actions-v2-use-cases.interface.js';
import { FoundTableActionWithEventsAndRulesDto } from '../../application/dto/found-table-action-with-events-and-rules.dto.js';
import { FindTableActionsDS } from '../../table-actions-module/application/data-sctructures/find-table-actions.ds.js';
import { BaseType } from '../../../../common/data-injection.tokens.js';
import { IGlobalDatabaseContext } from '../../../../common/application/global-database-context.interface.js';
import { findTablesInConnectionUtil } from '../../../table/utils/find-tables-in-connection.util.js';
import { Messages } from '../../../../exceptions/text/messages.js';
import { buildFoundTableActionEventsAndRulesDto } from '../utils/build-found-table-action-with-events-and-rules-dto.util.js';

@Injectable()
export class FindAllTableActionsWithRulesAndEventsUseCase
  extends AbstractUseCase<FindTableActionsDS, Array<FoundTableActionWithEventsAndRulesDto>>
  implements IGetTableActionV2
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: FindTableActionsDS): Promise<Array<FoundTableActionWithEventsAndRulesDto>> {
    const { connectionId, masterPwd, userId, tableName } = inputData;
    const connection = await this._dbContext.connectionRepository.findAndDecryptConnection(connectionId, masterPwd);
    const tablesInConnection = await findTablesInConnectionUtil(connection, userId, null);
    if (!tablesInConnection.includes(tableName)) {
      throw new HttpException(
        {
          message: Messages.TABLE_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const tableActions = await this._dbContext.tableActionRepository.findTableActionsWithRulesAndEvents(
      connectionId,
      tableName,
    );
    return tableActions.map((tableAction) => buildFoundTableActionEventsAndRulesDto(tableAction));
  }
}
