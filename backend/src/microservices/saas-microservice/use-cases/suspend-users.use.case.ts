import { Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { SuspendUsersDS } from '../data-structures/suspend-users.ds.js';
import { ISuspendUsers } from './saas-use-cases.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';

@Injectable()
export class SuspendUsersUseCase extends AbstractUseCase<SuspendUsersDS, void> implements ISuspendUsers {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: SuspendUsersDS): Promise<void> {
    const { emailsToSuspend, companyId } = inputData;
    if (emailsToSuspend.length) {
      const foundUsersToSuspend = await this._dbContext.userRepository.findUsersByEmailsAndCompanyId(
        emailsToSuspend,
        companyId,
      );
      const foundUsersToSuspendIds = foundUsersToSuspend.map((user) => user.id);
      await this._dbContext.userRepository.suspendUsers(foundUsersToSuspendIds);
    }
    await this._dbContext.userRepository.suspendNewestUsersInCompany(companyId, 3);
  }
}
