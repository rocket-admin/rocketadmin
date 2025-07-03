import { Inject, Injectable } from '@nestjs/common';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { ISaaSGetUsersCountInCompany } from './saas-use-cases.interface.js';

@Injectable()
export class GetUsersCountInCompanyByIdUseCase
  extends AbstractUseCase<string, number>
  implements ISaaSGetUsersCountInCompany
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  public async implementation(companyId: string): Promise<number> {
    const usersCount = await this._dbContext.userRepository.count({
      where: {
        company: {
          id: companyId,
        },
      },
    });
    return usersCount;
  }
}
