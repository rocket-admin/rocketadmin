import { Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { SuccessResponse } from '../../../microservices/saas-microservice/data-structures/common-responce.ds.js';
import { AddCompanyTabTitleDs } from '../application/data-structures/add-company-tab-title.ds.js';
import { IAddCompanyTabTitle } from './company-info-use-cases.interface.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { CompanyTabTitleEntity } from '../../company-tab-title/company-tab-title.entity.js';

@Injectable({ scope: Scope.REQUEST })
export class AddCompanyTabTitleUseCase
  extends AbstractUseCase<AddCompanyTabTitleDs, SuccessResponse>
  implements IAddCompanyTabTitle
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: AddCompanyTabTitleDs): Promise<SuccessResponse> {
    const { companyId, tab_title } = inputData;
    const company = await this._dbContext.companyInfoRepository.findCompanyWithTabTitle(companyId);
    if (!company) {
      throw new NotFoundException(Messages.COMPANY_NOT_FOUND);
    }

    if (company.tab_title) {
      const tabTitleForDeletion = await this._dbContext.companyTabTitleRepository.findOne({
        where: {
          company: {
            id: companyId,
          },
        },
      });
      if (tabTitleForDeletion) {
        await this._dbContext.companyTabTitleRepository.remove(tabTitleForDeletion);
      }
    }

    const newTabTitle = new CompanyTabTitleEntity();
    newTabTitle.company = company;
    newTabTitle.text = tab_title;
    await this._dbContext.companyTabTitleRepository.save(newTabTitle);
    return { success: true };
  }
}
