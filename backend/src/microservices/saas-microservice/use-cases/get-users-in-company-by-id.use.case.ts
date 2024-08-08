import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { UserEntity } from '../../../entities/user/user.entity.js';
import { ISaaSGetUsersInCompany } from './saas-use-cases.interface.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';

@Injectable()
export class GetUsersInCompanyByIdUseCase
  extends AbstractUseCase<string, UserEntity[]>
  implements ISaaSGetUsersInCompany
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(companyId: string): Promise<UserEntity[]> {
    const foundCompanyWithUsers = await this._dbContext.companyInfoRepository.findCompanyInfoWithUsersById(companyId);
    if (!foundCompanyWithUsers) {
      throw new NotFoundException(Messages.COMPANY_NOT_FOUND);
    }
    return foundCompanyWithUsers.users.map((user) => {
      delete user.password;
      return user;
    });
  }
}
