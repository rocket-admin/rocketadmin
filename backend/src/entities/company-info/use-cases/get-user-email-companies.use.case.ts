import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { SaasCompanyGatewayService } from '../../../microservices/gateways/saas-gateway.ts/saas-company-gateway.service.js';
import { FoundUserEmailCompaniesInfoDs } from '../application/data-structures/found-company-info.ds.js';
import { IGetUserEmailCompanies } from './company-info-use-cases.interface.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { isSaaS } from '../../../helpers/app/is-saas.js';
import { FoundSassCompanyInfoDS } from '../../../microservices/gateways/saas-gateway.ts/data-structures/found-saas-company-info.ds.js';

@Injectable()
export class GetUserEmailCompaniesUseCase
  extends AbstractUseCase<string, Array<FoundUserEmailCompaniesInfoDs>>
  implements IGetUserEmailCompanies
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private readonly saasCompanyGatewayService: SaasCompanyGatewayService,
  ) {
    super();
  }

  protected async implementation(userEmail: string): Promise<Array<FoundUserEmailCompaniesInfoDs>> {
    const useEmailCompaniesInfosFromCore = (
      await this._dbContext.companyInfoRepository.findCompanyInfosByUserEmail(userEmail)
    ).filter((companyInfo) => !!companyInfo);
    if (!useEmailCompaniesInfosFromCore.length) {
      throw new HttpException(
        {
          message: Messages.COMPANIES_USER_EMAIL_NOT_FOUND(userEmail),
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const companiesInfoFromCore: Array<FoundSassCompanyInfoDS> = [];

    if (isSaaS()) {
      const resultFromSaaS = await Promise.all(
        useEmailCompaniesInfosFromCore.map(async ({ id }) => {
          return await this.saasCompanyGatewayService.getCompanyInfo(id);
        }),
      );
      resultFromSaaS.filter((companyInfo) => !!companyInfo);
      companiesInfoFromCore.push(...resultFromSaaS);
    }
    return useEmailCompaniesInfosFromCore.map(({ id }) => {
      return {
        id: id,
        name: companiesInfoFromCore.find(({ id: companyId }) => companyId === id)?.name,
      };
    });
  }
}
