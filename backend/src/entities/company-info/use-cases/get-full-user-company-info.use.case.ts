import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { SaasCompanyGatewayService } from '../../../microservices/gateways/saas-gateway.ts/saas-company-gateway.service.js';
import { IGetUserFullCompanyInfo } from './company-info-use-cases.interface.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { isSaaS } from '../../../helpers/app/is-saas.js';
import {
  FoundUserCompanyInfoDs,
  FoundUserFullCompanyInfoDs,
} from '../application/data-structures/found-company-info.ds.js';
import { UserRoleEnum } from '../../user/enums/user-role.enum.js';
import { buildFoundCompanyFullInfoDs, buildFoundCompanyInfoDs } from '../utils/build-found-company-info-ds.js';

@Injectable()
export class GetUserCompanyFullInfoUseCase
  extends AbstractUseCase<string, FoundUserCompanyInfoDs>
  implements IGetUserFullCompanyInfo
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private readonly saasCompanyGatewayService: SaasCompanyGatewayService,
  ) {
    super();
  }

  protected async implementation(userId: string): Promise<FoundUserCompanyInfoDs | FoundUserFullCompanyInfoDs> {

    const foundFullUserCoreCompanyInfo =
      await this._dbContext.companyInfoRepository.findFullCompanyInfoByUserId(userId);

    if (!foundFullUserCoreCompanyInfo) {
      throw new HttpException(
        {
          message: Messages.COMPANY_NOT_FOUND,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const foundUser = await this._dbContext.userRepository.findOneUserByIdAndCompanyId(
      userId,
      foundFullUserCoreCompanyInfo.id,
    );

    if (!foundUser) {
      throw new HttpException(
        {
          message: Messages.USER_NOT_FOUND,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    let foundUserCompanySaasInfo = null;

    if (isSaaS()) {
      foundUserCompanySaasInfo = await this.saasCompanyGatewayService.getCompanyInfo(foundFullUserCoreCompanyInfo.id);
      if (!foundUserCompanySaasInfo) {
        throw new HttpException(
          {
            message: Messages.COMPANY_NOT_FOUND,
          },
          HttpStatus.NOT_FOUND,
        );
      }
    }

    if (foundUser.role === UserRoleEnum.ADMIN) {
      return buildFoundCompanyFullInfoDs(foundFullUserCoreCompanyInfo, foundUserCompanySaasInfo, foundUser.role);
    }

    return buildFoundCompanyInfoDs(foundFullUserCoreCompanyInfo, foundUserCompanySaasInfo);
  }
}
