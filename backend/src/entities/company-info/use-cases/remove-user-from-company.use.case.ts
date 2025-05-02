import { HttpException, HttpStatus, Inject, Injectable, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { SuccessResponse } from '../../../microservices/saas-microservice/data-structures/common-responce.ds.js';
import { RemoveUserFromCompanyDs } from '../application/data-structures/remove-user-from-company.ds.js';
import { IRemoveUserFromCompany } from './company-info-use-cases.interface.js';
import { SaasCompanyGatewayService } from '../../../microservices/gateways/saas-gateway.ts/saas-company-gateway.service.js';

@Injectable({ scope: Scope.REQUEST })
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
    if (foundCompanyWithUsers.users.length === 1) {
      throw new HttpException(
        {
          message: Messages.CANT_REMOVE_LAST_USER_FROM_COMPANY,
        },
        HttpStatus.BAD_REQUEST,
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
    foundCompanyWithUsers.users = foundCompanyWithUsers.users.filter((user) => user.id !== userId);
    await this._dbContext.companyInfoRepository.save(foundCompanyWithUsers);
    await this._dbContext.userRepository.remove(foundUser);
    await this.saasCompanyGatewayService.recountUsersInCompanyRequest(foundCompanyWithUsers.id);
    return {
      success: true,
    };
  }
}
