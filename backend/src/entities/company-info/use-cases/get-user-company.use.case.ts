import { HttpException, HttpStatus, Inject } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { SaasCompanyGatewayService } from '../../../microservices/gateways/saas-gateway.ts/saas-company-gateway.service.js';
import { IGetUserCompany } from './company-info-use-cases.interface.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { isSaaS } from '../../../helpers/app/is-saas.js';
import { FoundUserCompanyInfoDs } from '../application/data-structures/found-company-info.ds.js';
import { buildFoundCompanyInfoDs } from '../utils/build-found-company-info-ds.js';

export class GetUserCompanyUseCase extends AbstractUseCase<string, FoundUserCompanyInfoDs> implements IGetUserCompany {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private readonly saasCompanyGatewayService: SaasCompanyGatewayService,
  ) {
    super();
  }

  protected async implementation(userId: string): Promise<FoundUserCompanyInfoDs> {
    const foundUserCoreCompanyInfo = await this._dbContext.companyInfoRepository.findCompanyInfoByUserId(userId);
    
    if (!foundUserCoreCompanyInfo) {
      throw new HttpException(
        {
          message: Messages.COMPANY_NOT_FOUND,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    let foundUserCompanySaasInfo = null;
    if (isSaaS()) {
      foundUserCompanySaasInfo = await this.saasCompanyGatewayService.getCompanyInfo(foundUserCoreCompanyInfo.id);
      if (!foundUserCompanySaasInfo) {
        throw new HttpException(
          {
            message: Messages.COMPANY_NOT_FOUND,
          },
          HttpStatus.NOT_FOUND,
        );
      }
    }
    return buildFoundCompanyInfoDs(foundUserCoreCompanyInfo, foundUserCompanySaasInfo);
  }
}
