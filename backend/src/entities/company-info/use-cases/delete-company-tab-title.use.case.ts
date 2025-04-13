import { Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { SuccessResponse } from '../../../microservices/saas-microservice/data-structures/common-responce.ds.js';
import { IDeleteCompanyTabTitle } from './company-info-use-cases.interface.js';

@Injectable({ scope: Scope.REQUEST })
export class DeleteCompanyTabTitleUseCase
  extends AbstractUseCase<string, SuccessResponse>
  implements IDeleteCompanyTabTitle
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(companyId: string): Promise<SuccessResponse> {
    const company = await this._dbContext.companyInfoRepository.findCompanyWithTabTitle(companyId);
    if (!company) {
      throw new NotFoundException(Messages.COMPANY_NOT_FOUND);
    }

    const tabTitleForDeletion = await this._dbContext.companyTabTitleRepository.findOne({
      where: {
        company: {
          id: companyId,
        },
      },
    });

    if (!tabTitleForDeletion) {
      throw new NotFoundException(Messages.COMPANY_TAB_TITLE_NOT_FOUND);
    }

    await this._dbContext.companyTabTitleRepository.remove(tabTitleForDeletion);
    return { success: true };
  }
}
