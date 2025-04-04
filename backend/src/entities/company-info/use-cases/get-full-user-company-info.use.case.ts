import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { isSaaS } from '../../../helpers/app/is-saas.js';
import { SaasCompanyGatewayService } from '../../../microservices/gateways/saas-gateway.ts/saas-company-gateway.service.js';
import { UserRoleEnum } from '../../user/enums/user-role.enum.js';
import {
  FoundUserCompanyInfoDs,
  FoundUserFullCompanyInfoDs,
} from '../application/data-structures/found-company-info.ds.js';
import { CompanyInfoEntity } from '../company-info.entity.js';
import { buildFoundCompanyFullInfoDs, buildFoundCompanyInfoDs } from '../utils/build-found-company-info-ds.js';
import { IGetUserFullCompanyInfo } from './company-info-use-cases.interface.js';

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
    const foundCompanyInfoByUserId = await this._dbContext.companyInfoRepository.findCompanyInfoByUserId(userId);

    if (!foundCompanyInfoByUserId) {
      throw new HttpException(
        {
          message: Messages.COMPANY_NOT_FOUND,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const foundUser = await this._dbContext.userRepository.findOneUserByIdAndCompanyId(
      userId,
      foundCompanyInfoByUserId.id,
    );

    let foundFullUserCoreCompanyInfo: CompanyInfoEntity;

    if (foundUser.role === UserRoleEnum.ADMIN) {
      //todo will be reworked in architecture refactoring
      const companyId = foundCompanyInfoByUserId.id;

      const [companyInfoWithoutConnections, companyInfoWithUsers] = await Promise.all([
        this._dbContext.companyInfoRepository.findCompanyInfoByCompanyIdWithoutConnections(companyId),
        this._dbContext.companyInfoRepository.findAllCompanyWithConnectionsUsersJoining(companyId),
      ]);

      const uniqueConnections = companyInfoWithUsers.users
        .flatMap((user) => user.groups.map((group) => group.connection))
        .filter((connection, index, self) => index === self.findIndex((t) => t.id === connection.id));

      companyInfoWithoutConnections.connections = uniqueConnections;
      foundFullUserCoreCompanyInfo = companyInfoWithoutConnections;
    } else {
      foundFullUserCoreCompanyInfo = await this._dbContext.companyInfoRepository.findFullCompanyInfoByUserId(userId);
    }

    let foundUserCompanySaasInfo = null;

    let customDomain = null;
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
      customDomain = await this.saasCompanyGatewayService.getCompanyCustomDomainById(foundCompanyInfoByUserId.id);
    }

    if (foundUser.role === UserRoleEnum.ADMIN) {
      return buildFoundCompanyFullInfoDs(
        foundFullUserCoreCompanyInfo,
        foundUserCompanySaasInfo,
        foundUser.role,
        customDomain,
      );
    }

    return buildFoundCompanyInfoDs(foundFullUserCoreCompanyInfo, foundUserCompanySaasInfo, customDomain);
  }
}
