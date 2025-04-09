import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { FoundCompanyTabTitleRO } from '../application/data-structures/found-company-tab-title.ro.js';
import { IFindCompanyTabTitle } from './company-info-use-cases.interface.js';

@Injectable()
export class FindCompanyTabTitleUseCase
  extends AbstractUseCase<string, FoundCompanyTabTitleRO>
  implements IFindCompanyTabTitle
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(companyId: string): Promise<FoundCompanyTabTitleRO> {
    const company = await this._dbContext.companyInfoRepository.findCompanyWithTabTitle(companyId);
    if (!company) {
      throw new NotFoundException(Messages.COMPANY_NOT_FOUND);
    }

    return {
      tab_title: company.tab_title?.text ?? null,
    };
  }
}
