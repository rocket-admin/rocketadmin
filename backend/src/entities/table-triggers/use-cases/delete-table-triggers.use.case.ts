import { Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { FoundTableTriggersWithActionsDTO } from '../application/dto/found-table-triggers-with-actions.dto.js';
import { IDeleteTableTriggers } from './table-triggers-use-cases.interface.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { buildFoundTableTriggerDto } from '../utils/build-found-table-triggers-dto.util.js';
import { Messages } from '../../../exceptions/text/messages.js';

@Injectable({ scope: Scope.REQUEST })
export class DeleteTableTriggersUseCase
  extends AbstractUseCase<string, FoundTableTriggersWithActionsDTO>
  implements IDeleteTableTriggers
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(triggersId: string): Promise<FoundTableTriggersWithActionsDTO> {
    const foundTableTriggers = await this._dbContext.tableTriggersRepository.findOne({ where: { id: triggersId } });
    if (!foundTableTriggers) {
      throw new NotFoundException(Messages.TABLE_TRIGGERS_NOT_FOUND_FOR_DELETE);
    }
    await this._dbContext.tableTriggersRepository.delete({ id: triggersId });
    return buildFoundTableTriggerDto(foundTableTriggers);
  }
}
