import { BadRequestException, Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { SuccessResponse } from '../../../microservices/saas-microservice/data-structures/common-responce.ds.js';
import { SuspendUsersInCompanyDS } from '../application/data-structures/suspend-users-in-company.ds.js';
import { ISuspendUsersInCompany } from './company-info-use-cases.interface.js';

@Injectable({ scope: Scope.REQUEST })
export class SuspendUsersInCompanyUseCase
  extends AbstractUseCase<SuspendUsersInCompanyDS, SuccessResponse>
  implements ISuspendUsersInCompany
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: SuspendUsersInCompanyDS): Promise<SuccessResponse> {
    const { companyInfoId } = inputData;
    const usersEmails = inputData.usersEmails.map((email) => email.toLowerCase());
    const foundCompany = await this._dbContext.companyInfoRepository.findCompanyInfoWithUsersById(companyInfoId);
    if (!foundCompany) {
      throw new NotFoundException(Messages.COMPANY_NOT_FOUND);
    }
    const userIdsToSuspend = foundCompany.users
      .filter((user) => usersEmails.includes(user.email.toLowerCase()))
      .map((user) => user.id);

    if (!userIdsToSuspend.length) {
      throw new BadRequestException(Messages.NO_USERS_TO_SUSPEND);
    }

    const currentUnsuspendUsersInCompany = foundCompany.users.filter((user) => !user.suspended);
    const isUnsuspendUserLeft = currentUnsuspendUsersInCompany.length - userIdsToSuspend.length <= 0;

    if (isUnsuspendUserLeft) {
      throw new BadRequestException(Messages.CANNOT_SUSPEND_LAST_USER);
    }
    await this._dbContext.userRepository.suspendUsers(userIdsToSuspend);
    return {
      success: true,
    };
  }
}
