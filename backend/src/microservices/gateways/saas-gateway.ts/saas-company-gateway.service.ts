import { Injectable } from '@nestjs/common';
import { BaseSaasGatewayService } from './base-saas-gateway.service.js';
import { RegisteredCompanyUserInviteGroupDS } from './data-structures/registered-company-when-user-invite-group.ds.js';
import { isObjectEmpty } from '../../../helpers/is-object-empty.js';

@Injectable()
export class SaasCompanyGatewayService extends BaseSaasGatewayService {
  constructor() {
    super();
  }

  public async registerCompanyWhenUserInviteInGroup(
    userId: string,
    userEmail: string,
    gitHubId: number,
  ): Promise<RegisteredCompanyUserInviteGroupDS | null> {
    const registrationResult = await this.sendRequestToSaaS(`/webhook/company/register`, 'POST', {
      userId,
      userEmail,
      gitHubId,
    });

    if (isObjectEmpty(registrationResult.body)) {
      return null;
    }
    return {
      companyId: registrationResult.body.id as string,
      userId: registrationResult.body.users[0].id as string,
    };
  }

  public async canInviteMoreUsers(companyId: string): Promise<boolean> {
    const canInviteMoreUsersResult = await this.sendRequestToSaaS(
      `/webhook/company/invite/check/${companyId}`,
      'GET',
      null,
    );
    return canInviteMoreUsersResult.body.success as boolean;
  }

  public async inviteNewUserInCompany(
    companyId: string,
    newUserEmail: string,
    newUserId: string,
    userRole: string,
    inviterId: string,
  ): Promise<RegisteredCompanyUserInviteGroupDS | null> {
    const registrationResult = await this.sendRequestToSaaS(`/webhook/company/invite`, 'POST', {
      userId: newUserId,
      userEmail: newUserEmail,
      companyId: companyId,
      userRole: userRole,
      inviterId: inviterId,
    });
    if (isObjectEmpty(registrationResult.body)) {
      return null;
    }
    return {
      companyId: registrationResult.body.companyId as string,
      userId: registrationResult.body.userId as string,
    };
  }

  public async registerEmptyCompany(
    userId: string,
    userEmail: string,
    gitHubId: number,
  ): Promise<RegisteredCompanyUserInviteGroupDS | null> {
    return await this.registerCompanyWhenUserInviteInGroup(userId, userEmail, gitHubId);
  }
}
