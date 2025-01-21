import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Scope,
} from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { SaasCompanyGatewayService } from '../../../microservices/gateways/saas-gateway.ts/saas-company-gateway.service.js';
import { SuccessResponse } from '../../../microservices/saas-microservice/data-structures/common-responce.ds.js';
import { SuspendUsersInCompanyDS } from '../application/data-structures/suspend-users-in-company.ds.js';
import { ISuspendUsersInCompany } from './company-info-use-cases.interface.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { isSaaS } from '../../../helpers/app/is-saas.js';

@Injectable({ scope: Scope.REQUEST })
export class UnsuspendUsersInCompanyUseCase
  extends AbstractUseCase<SuspendUsersInCompanyDS, SuccessResponse>
  implements ISuspendUsersInCompany
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private readonly saasCompanyGatewayService: SaasCompanyGatewayService,
  ) {
    super();
  }

  protected async implementation(inputData: SuspendUsersInCompanyDS): Promise<SuccessResponse> {
    const { companyInfoId } = inputData;
    const usersEmails = inputData.usersEmails.map((email) => email.toLowerCase());
    const foundCompany = await this._dbContext.companyInfoRepository.findCompanyInfoWithUsersById(companyInfoId);
    if (!foundCompany) {
      throw new NotFoundException(Messages.COMPANY_NOT_FOUND);
    }
    const userIdsToSuspend = foundCompany.users
      .filter((user) => usersEmails.includes(user.email.toLowerCase()))
      .map((user) => user.id);

    if (!userIdsToSuspend.length) {
      throw new BadRequestException(Messages.NO_USERS_TO_SUSPEND);
    }

    if (isSaaS()) {
      const canInviteMoreUsers = await this.saasCompanyGatewayService.canInviteMoreUsers(companyInfoId);
      if (!canInviteMoreUsers && foundCompany.users?.length > 3) {
        throw new HttpException(
          {
            message: Messages.CANT_UNSUSPEND_USERS_FREE_PLAN,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      const { success } = await this.saasCompanyGatewayService.unSuspendUsersInCompany(companyInfoId, userIdsToSuspend);
      if (!success) {
        throw new InternalServerErrorException(Messages.SAAS_SUSPEND_USERS_FAILED_UNHANDLED_ERROR);
      }
    }
    await this._dbContext.userRepository.unSuspendUsers(userIdsToSuspend);
    return {
      success: true,
    };
  }
}
