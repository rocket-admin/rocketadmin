import { HttpException, HttpStatus, Inject, Injectable, InternalServerErrorException, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { RegisteredUserDs } from '../application/data-structures/registered-user.ds.js';
import { IDeleteUserAccount } from './user-use-cases.interfaces.js';
import { SaasCompanyGatewayService } from '../../../microservices/gateways/saas-gateway.ts/saas-company-gateway.service.js';
import { isSaaS } from '../../../helpers/app/is-saas.js';

@Injectable({ scope: Scope.REQUEST })
export class DeleteUserAccountUseCase
  extends AbstractUseCase<string, Omit<RegisteredUserDs, 'token'>>
  implements IDeleteUserAccount
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private readonly saasCompanyGatewayService: SaasCompanyGatewayService,
  ) {
    super();
  }

  protected async implementation(userId: string): Promise<Omit<RegisteredUserDs, 'token'>> {
    const foundUser = await this._dbContext.userRepository.findOneUserById(userId);
    if (!foundUser) {
      throw new HttpException(
        {
          message: Messages.USER_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const userCompanyId = foundUser.company.id;

    const usersCountInCompany = await this._dbContext.userRepository.countUsersInCompany(userCompanyId);

    if (usersCountInCompany <= 1) {
      const foundFullCompany = await this._dbContext.companyInfoRepository.findFullCompanyInfoByUserId(userId);
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
    } else {
      await this._dbContext.userRepository.deleteUserEntity(foundUser);
    }

    return {
      id: foundUser.id,
      email: foundUser.email,
      name: foundUser.name,
      externalRegistrationProvider: foundUser.externalRegistrationProvider,
    };
  }
}
