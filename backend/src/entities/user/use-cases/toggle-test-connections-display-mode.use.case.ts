import { Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { SuccessResponse } from '../../../microservices/saas-microservice/data-structures/common-responce.ds.js';
import { IToggleTestConnectionsMode } from './user-use-cases.interfaces.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { ToggleConnectionDisplayModeDs } from '../application/data-structures/toggle-connection-display-mode.ds.js';

@Injectable({ scope: Scope.REQUEST })
export class ToggleTestConnectionsDisplayModeUseCase
  extends AbstractUseCase<ToggleConnectionDisplayModeDs, SuccessResponse>
  implements IToggleTestConnectionsMode
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  public async implementation(inputData: ToggleConnectionDisplayModeDs): Promise<SuccessResponse> {
    const { userId, displayMode } = inputData;
    const user = await this._dbContext.userRepository.findOneUserById(userId);
    if (!user) {
      throw new NotFoundException(Messages.USER_NOT_FOUND);
    }
    user.showTestConnections = displayMode;
    await this._dbContext.userRepository.save(user);
    return { success: true };
  }
}
