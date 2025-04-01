import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IFindCompanyLogo } from './company-info-use-cases.interface.js';
import { FoundCompanyLogoRO } from '../application/dto/found-company-logo.ro.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { Messages } from '../../../exceptions/text/messages.js';

@Injectable()
export class FindCompanyLogoUseCase extends AbstractUseCase<string, FoundCompanyLogoRO> implements IFindCompanyLogo {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(companyId: string): Promise<FoundCompanyLogoRO> {
    const company = await this._dbContext.companyInfoRepository.findCompanyWithLogo(companyId);
    if (!company) {
      throw new NotFoundException(Messages.COMPANY_NOT_FOUND);
    }
    return {
      logo: company.logo?.logo.toString('base64') || null,
    };
  }
}
