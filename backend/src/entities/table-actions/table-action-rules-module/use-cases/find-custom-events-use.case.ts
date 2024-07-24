import { Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../../common/abstract-use.case.js';
import { FindActionRulesDS } from '../application/data-structures/find-all-table-triggers.ds.js';
import { FoundActionEventDTO } from '../application/dto/found-action-rules-with-actions-and-events.dto.js';
import { IFindCustomEvents } from './action-rules-use-cases.interface.js';
import { IGlobalDatabaseContext } from '../../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../../common/data-injection.tokens.js';
import { buildActionEventDto } from '../utils/build-found-action-event-dto.util.js';

@Injectable()
export class FindCustomEventsUseCase
  extends AbstractUseCase<FindActionRulesDS, Array<FoundActionEventDTO>>
  implements IFindCustomEvents
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  public async implementation(inputData: FindActionRulesDS): Promise<Array<FoundActionEventDTO>> {
    const { connectionId, tableName } = inputData;
    const foundRuleEvents = await this._dbContext.actionEventsRepository.findCustomEventsForTable(
      connectionId,
      tableName,
    );
    return foundRuleEvents.map((actionEvent) => buildActionEventDto(actionEvent));
  }
}
