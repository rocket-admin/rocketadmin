import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { FoundCompanyFaviconRO } from '../application/dto/found-company-logo.ro.js';
import { IFindCompanyFavicon } from './company-info-use-cases.interface.js';

@Injectable()
export class FindCompanyFaviconUseCase
  extends AbstractUseCase<string, FoundCompanyFaviconRO>
  implements IFindCompanyFavicon
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(companyId: string): Promise<FoundCompanyFaviconRO> {
    const company = await this._dbContext.companyInfoRepository.findCompanyWithFavicon(companyId);
    if (!company) {
      throw new NotFoundException(Messages.COMPANY_NOT_FOUND);
    }
    if (!company.favicon) {
      return {
        favicon: null,
      };
    }
    return {
      favicon: {
        image: company.favicon.image.toString('base64'),
        mimeType: company.favicon.mimeType,
      },
    };
  }
}
