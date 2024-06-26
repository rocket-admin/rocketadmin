import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import AbstractUseCase from '../../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../../common/data-injection.tokens.js';
import { FoundTableTriggersWithActionsDTO } from '../application/dto/found-table-triggers-with-actions.dto.js';
import { IFindTableTrigger } from './table-triggers-use-cases.interface.js';
import { Messages } from '../../../../exceptions/text/messages.js';
import { buildFoundTableTriggerDto } from '../utils/build-found-table-triggers-dto.util.js';

@Injectable()
export class FindTableTriggerUseCase
  extends AbstractUseCase<string, FoundTableTriggersWithActionsDTO>
  implements IFindTableTrigger
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(triggerId: string): Promise<FoundTableTriggersWithActionsDTO> {
    const foundTableTriggers = await this._dbContext.actionRulesRepository.findOne({
      where: { id: triggerId },
      relations: ['table_actions'],
    });
    if (!foundTableTriggers) {
      throw new NotFoundException(Messages.TABLE_TRIGGERS_NOT_FOUND);
    }
    return buildFoundTableTriggerDto(foundTableTriggers);
  }
}
