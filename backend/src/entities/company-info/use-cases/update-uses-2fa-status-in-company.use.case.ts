import { Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { UpdateUsers2faStatusInCompanyDs } from '../application/data-structures/update-users-2fa-status-in-company.ds.js';
import { SuccessResponse } from '../../../microservices/saas-microservice/data-structures/common-responce.ds.js';
import { IUpdateUsers2faStatusInCompany } from './company-info-use-cases.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { SaasCompanyGatewayService } from '../../../microservices/gateways/saas-gateway.ts/saas-company-gateway.service.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { isSaaS } from '../../../helpers/app/is-saas.js';
import { send2faEnabledInCompany } from '../../email/utils/send-2fa-enabled-in-company-to-users.js';

@Injectable({ scope: Scope.REQUEST })
export class UpdateUses2faStatusInCompanyUseCase
  extends AbstractUseCase<UpdateUsers2faStatusInCompanyDs, SuccessResponse>
  implements IUpdateUsers2faStatusInCompany
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private readonly saasCompanyGatewayService: SaasCompanyGatewayService,
  ) {
    super();
  }

  protected async implementation(inputData: UpdateUsers2faStatusInCompanyDs): Promise<SuccessResponse> {
    const { companyId, is2faEnabled } = inputData;
    const foundCompany = await this._dbContext.companyInfoRepository.findCompanyInfoWithUsersById(companyId);
    if (!foundCompany) {
      throw new NotFoundException(Messages.COMPANY_NOT_FOUND);
    }
    foundCompany.is2faEnabled = is2faEnabled;
    if (isSaaS()) {
      const updateCompany2faStatusInCoreResult = await this.saasCompanyGatewayService.updateCompany2faStatus(
        companyId,
        is2faEnabled,
      );
      if (!updateCompany2faStatusInCoreResult.success) {
        throw new NotFoundException(Messages.COMPANY_NOT_FOUND);
      }
    }
    if (is2faEnabled) {
      const usersEmails = foundCompany.users.map((user) => user.email);
      send2faEnabledInCompany(usersEmails, foundCompany.name);
    }
    await this._dbContext.companyInfoRepository.save(foundCompany);
    return { success: true };
  }
}
