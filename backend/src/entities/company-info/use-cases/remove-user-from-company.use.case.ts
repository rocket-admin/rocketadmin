import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { SaasCompanyGatewayService } from '../../../microservices/gateways/saas-gateway.ts/saas-company-gateway.service.js';
import { RemoveUserFromCompanyDs } from '../application/data-structures/remove-user-from-company.ds.js';
import { IRemoveUserFromCompany } from './company-info-use-cases.interface.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { isSaaS } from '../../../helpers/app/is-saas.js';
import { SuccessResponse } from '../../../microservices/saas-microservice/data-structures/common-responce.ds.js';

@Injectable()
export class RemoveUserFromCompanyUseCase
  extends AbstractUseCase<RemoveUserFromCompanyDs, SuccessResponse>
  implements IRemoveUserFromCompany
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private readonly saasCompanyGatewayService: SaasCompanyGatewayService,
  ) {
    super();
  }

  protected async implementation(inputData: RemoveUserFromCompanyDs): Promise<SuccessResponse> {
    const { companyId, userId } = inputData;
    const foundCompanyWithUsers = await this._dbContext.companyInfoRepository.findCompanyInfoWithUsersById(companyId);
    if (!foundCompanyWithUsers) {
      throw new HttpException(
        {
          message: Messages.COMPANY_NOT_FOUND,
        },
        HttpStatus.NOT_FOUND,
      );
    }
    const foundUser = foundCompanyWithUsers.users.find((user) => user.id === userId);
    if (!foundUser) {
      throw new HttpException(
        {
          message: Messages.USER_NOT_FOUND,
        },
        HttpStatus.NOT_FOUND,
      );
    }
    if (isSaaS()) {
      const saasResponse = await this.saasCompanyGatewayService.removeUserFromCompany(companyId, foundUser.id);
      if (!saasResponse) {
        throw new HttpException(
          {
            message: Messages.FAILED_REMOVE_USER_SAAS_UNHANDLED_ERROR,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
    foundUser.company = null;
    foundUser.groups = [];
    foundUser.connections = [];
    await this._dbContext.userRepository.saveUserEntity(foundUser);
    return {
      success: true,
    };
  }
}
