import { HttpException, HttpStatus, Inject, Injectable, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { SaasCompanyGatewayService } from '../../../microservices/gateways/saas-gateway.ts/saas-company-gateway.service.js';
import { SuccessResponse } from '../../../microservices/saas-microservice/data-structures/common-responce.ds.js';
import { UpdateCompanyNameDS } from '../application/data-structures/update-company-name.ds.js';
import { IUpdateCompanyName } from './company-info-use-cases.interface.js';
import { isSaaS } from '../../../helpers/app/is-saas.js';
import { Messages } from '../../../exceptions/text/messages.js';

@Injectable({ scope: Scope.REQUEST })
export class UpdateCompanyNameUseCase
  extends AbstractUseCase<UpdateCompanyNameDS, SuccessResponse>
  implements IUpdateCompanyName
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private readonly saasCompanyGatewayService: SaasCompanyGatewayService,
  ) {
    super();
  }

  protected async implementation(inputData: UpdateCompanyNameDS): Promise<SuccessResponse> {
    const { companyId, name } = inputData;
    const foundCompany = await this._dbContext.companyInfoRepository.findOneBy({ id: companyId });

    if (isSaaS()) {
      const saasResponse = await this.saasCompanyGatewayService.updateCompanyName(companyId, name);
      if (!saasResponse) {
        throw new HttpException(
          {
            message: Messages.COMPANY_NAME_UPDATE_FAILED_UNHANDLED_ERROR,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
    foundCompany.name = name;
    await this._dbContext.companyInfoRepository.save(foundCompany);
    return {
      success: true,
    };
  }
}
