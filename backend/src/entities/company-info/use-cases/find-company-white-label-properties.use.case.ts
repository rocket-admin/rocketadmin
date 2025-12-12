import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { FoundCompanyWhiteLabelPropertiesRO } from '../application/dto/found-company-white-label-properties.ro.js';
import { IGetCompanyWhiteLabelProperties } from './company-info-use-cases.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { isSaaS } from '../../../helpers/app/is-saas.js';
import { SaasCompanyGatewayService } from '../../../microservices/gateways/saas-gateway.ts/saas-company-gateway.service.js';

@Injectable()
export class FindCompanyWhiteLabelPropertiesUseCase
  extends AbstractUseCase<string, FoundCompanyWhiteLabelPropertiesRO>
  implements IGetCompanyWhiteLabelProperties
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private readonly saasCompanyGatewayService: SaasCompanyGatewayService,
  ) {
    super();
  }

  protected async implementation(companyId: string): Promise<FoundCompanyWhiteLabelPropertiesRO> {
    const company = await this._dbContext.companyInfoRepository.findCompanyWithWhiteLabelProperties(companyId);
    if (!company) {
      throw new NotFoundException(Messages.COMPANY_NOT_FOUND);
    }

    let companySubscriptionLevel = null;
    if (isSaaS()) {
      const companyInfoFromSaas = await this.saasCompanyGatewayService.getCompanyInfo(companyId);
      if (!companyInfoFromSaas) {
        throw new NotFoundException(Messages.COMPANY_NOT_FOUND);
      }
      companySubscriptionLevel = companyInfoFromSaas.subscriptionLevel;
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
      subscriptionLevel: companySubscriptionLevel,
    };
  }
}
