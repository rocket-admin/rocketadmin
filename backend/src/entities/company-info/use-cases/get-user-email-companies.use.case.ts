import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { FoundUserEmailCompaniesInfoDs } from '../application/data-structures/found-company-info.ds.js';
import { IGetUserEmailCompanies } from './company-info-use-cases.interface.js';

@Injectable()
export class GetUserEmailCompaniesUseCase
  extends AbstractUseCase<string, Array<FoundUserEmailCompaniesInfoDs>>
  implements IGetUserEmailCompanies
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(userEmail: string): Promise<Array<FoundUserEmailCompaniesInfoDs>> {
    const useEmailCompaniesInfosFromCore = await this._dbContext.companyInfoRepository.findCompanyInfosByUserEmail(
      userEmail.toLowerCase(),
    );
    if (!useEmailCompaniesInfosFromCore.length) {
      throw new HttpException(
        {
          message: Messages.COMPANIES_USER_EMAIL_NOT_FOUND(userEmail),
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    return useEmailCompaniesInfosFromCore.map(({ id, name }) => {
      return {
        id,
        name,
      };
    });
  }
}
