import { Inject, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { SuccessResponse } from '../../../microservices/saas-microservice/data-structures/common-responce.ds.js';
import { IDeleteCompany } from './company-info-use-cases.interface.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { isSaaS } from '../../../helpers/app/is-saas.js';
import { SaasCompanyGatewayService } from '../../../microservices/gateways/saas-gateway.ts/saas-company-gateway.service.js';

export class DeleteCompanyUseCase extends AbstractUseCase<string, SuccessResponse> implements IDeleteCompany {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private readonly saasCompanyGatewayService: SaasCompanyGatewayService,
  ) {
    super();
  }

  protected async implementation(userId: string): Promise<SuccessResponse> {
    let count = 0;
    const foundFullCompany = await this._dbContext.companyInfoRepository.findFullCompanyInfoByUserId(userId);
    if (!foundFullCompany) {
      throw new NotFoundException(Messages.COMPANY_NOT_FOUND);
    }
    const { users, connections, invitations, id } = foundFullCompany;
    if (isSaaS()) {
      const deleteResult = await this.saasCompanyGatewayService.deleteCompany(id);
      if (!deleteResult) {
        throw new InternalServerErrorException(Messages.SAAS_DELETE_COMPANY_FAILED_UNHANDLED_ERROR);
      }
    }
    if (users.length) {
      await this._dbContext.userRepository.remove(users);
    }
    if (connections.length) {
      await this._dbContext.connectionRepository.remove(connections);
    }
    if (invitations.length) {
      await this._dbContext.invitationInCompanyRepository.remove(invitations);
    }
    await this._dbContext.companyInfoRepository.remove(foundFullCompany);
    return {
      success: true,
    };
  }
}
