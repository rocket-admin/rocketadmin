import { HttpException, HttpStatus, Inject, Injectable, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { SuccessResponse } from '../../../microservices/saas-microservice/data-structures/common-responce.ds.js';
import { UpdateUsersCompanyRolesDs } from '../application/data-structures/update-users-company-roles.ds.js';
import { IUpdateUsersCompanyRoles } from './company-info-use-cases.interface.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { SaasCompanyGatewayService } from '../../../microservices/gateways/saas-gateway.ts/saas-company-gateway.service.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { UserEntity } from '../../user/user.entity.js';
import { UserRoleEnum } from '../../user/enums/user-role.enum.js';
import { isSaaS } from '../../../helpers/app/is-saas.js';

@Injectable({ scope: Scope.REQUEST })
export class UpdateUsersCompanyRolesUseCase
  extends AbstractUseCase<UpdateUsersCompanyRolesDs, SuccessResponse>
  implements IUpdateUsersCompanyRoles
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private readonly saasCompanyGatewayService: SaasCompanyGatewayService,
  ) {
    super();
  }

  protected async implementation(inputData: UpdateUsersCompanyRolesDs): Promise<SuccessResponse> {
    const { companyId, users } = inputData;
    const foundCompanyWithUsers = await this._dbContext.companyInfoRepository.findCompanyInfoWithUsersById(companyId);
    if (!foundCompanyWithUsers) {
      throw new HttpException(
        {
          message: Messages.COMPANY_NOT_FOUND,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const companyUsersToUpdate: Array<UserEntity> = foundCompanyWithUsers.users.filter(
      (userInCompany) => !!users.find((userFromReceivedUsers) => userFromReceivedUsers.userId === userInCompany.id),
    );

    if (companyUsersToUpdate.length === 0) {
      throw new HttpException(
        {
          message: Messages.NO_USERS_FOUND_TO_UPDATE_ROLES,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const companyUsersToUpdateIds: Array<string> = companyUsersToUpdate.map((user) => user.id);

    const clearUsersWithNewRoles: Array<{ userId: string; role: UserRoleEnum }> = companyUsersToUpdateIds.map(
      (userId) => {
        return {
          userId: userId,
          role: users.find((user) => user.userId === userId).role,
        };
      },
    );

    if (isSaaS()) {
      const saasUpdateResponse = await this.saasCompanyGatewayService.updateUsersRolesInCompany(
        clearUsersWithNewRoles,
        companyId,
      );
      if (!saasUpdateResponse.success) {
        throw new HttpException(
          {
            message: Messages.SAAS_UPDATE_USERS_ROLES_FAILED_UNHANDLED_ERROR,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }

    const usersWithUpdatedRoles = companyUsersToUpdate.map((user) => {
      const newUserRole = clearUsersWithNewRoles.find((userWithNewRole) => userWithNewRole.userId === user.id).role;
      user.role = newUserRole;
      return user;
    });

    try {
      await this._dbContext.userRepository.bulkSaveUpdatedUsers(usersWithUpdatedRoles);
      return {
        success: true,
      };
    } catch (e) {
      throw new HttpException(
        {
          message: Messages.USER_ROLES_UPDATE_FAILED,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
