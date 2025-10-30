import { Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { ISuspendUsersOverLimit } from './saas-use-cases.interface.js';
import { Constants } from '../../../helpers/constants/constants.js';

@Injectable()
export class SuspendUsersOverLimitUseCase extends AbstractUseCase<string, void> implements ISuspendUsersOverLimit {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(companyId: string): Promise<void> {
    const foundUsersInCompany = await this._dbContext.userRepository.findUsersInCompany(companyId, true);
    const usersToSuspend = foundUsersInCompany.slice(Constants.FREE_PLAN_USERS_COUNT);

    if (usersToSuspend.length > 0) {
      const userIdsToSuspend = usersToSuspend.map((user) => user.id);
      await this._dbContext.userRepository.suspendUsers(userIdsToSuspend);
    }
  }
}
