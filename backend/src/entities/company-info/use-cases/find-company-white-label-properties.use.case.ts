import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { FoundCompanyWhiteLabelPropertiesRO } from '../application/dto/found-company-white-label-properties.ro.js';
import { IGetCompanyWhiteLabelProperties } from './company-info-use-cases.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { Messages } from '../../../exceptions/text/messages.js';

@Injectable()
export class FindCompanyWhiteLabelPropertiesUseCase
  extends AbstractUseCase<string, FoundCompanyWhiteLabelPropertiesRO>
  implements IGetCompanyWhiteLabelProperties
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(companyId: string): Promise<FoundCompanyWhiteLabelPropertiesRO> {
    const company = await this._dbContext.companyInfoRepository.findCompanyWithWhiteLabelProperties(companyId);
    if (!company) {
      throw new NotFoundException(Messages.COMPANY_NOT_FOUND);
    }

    return {
      logo: company.logo
        ? {
            image: company.logo.image.toString('base64'),
            mimeType: company.logo.mimeType,
          }
        : null,
      favicon: company.favicon
        ? {
            image: company.favicon.image.toString('base64'),
            mimeType: company.favicon.mimeType,
          }
        : null,
      tab_title: company.tab_title?.text ?? null,
    };
  }
}
