import { Injectable } from '@nestjs/common';
import { BaseSaasGatewayService } from './base-saas-gateway.service.js';
import { RegisteredCompanyUserInviteGroupDS } from './data-structures/registered-company-when-user-invite-group.ds.js';
import { isObjectEmpty } from '../../../helpers/is-object-empty.js';
import { UserRoleEnum } from '../../../entities/user/enums/user-role.enum.js';
import { isSaaS } from '../../../helpers/app/is-saas.js';
import { FoundSassCompanyInfoDS } from './data-structures/found-saas-company-info.ds.js';

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
    if (!isSaaS()) {
      return true;
    }
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

  public async invitationSentWebhook(
    companyId: string,
    newUserEmail: string,
    userRole: UserRoleEnum,
    inviterId: string,
    verificationString: string,
  ): Promise<void> {
    await this.sendRequestToSaaS(`/webhook/company/invitation`, 'POST', {
      userEmail: newUserEmail,
      companyId: companyId,
      userRole: userRole,
      inviterId: inviterId,
      verificationString: verificationString,
    });
  }

  public async invitationAcceptedWebhook(
    newUserId: string,
    companyId: string,
    userRole: UserRoleEnum,
    newUserEmail: string,
  ): Promise<void> {
    await this.sendRequestToSaaS(`/webhook/company/invitation/accept`, 'POST', {
      newUserId,
      companyId,
      userRole,
      newUserEmail,
    });
  }

  public async getCompanyInfo(companyId: string): Promise<FoundSassCompanyInfoDS | null> {
    const result = await this.sendRequestToSaaS(`/webhook/company/${companyId}`, 'GET', null);
    if (this.isDataFoundSassCompanyInfoDS(result.body)) {
      return result.body;
    }
    return null;
  }

  private isDataFoundSassCompanyInfoDS(data: unknown): data is FoundSassCompanyInfoDS {
    return (
      typeof data === 'object' &&
      data !== null &&
      'id' in data &&
      'additional_info' in data &&
      'name' in data &&
      'createdAt' in data &&
      'updatedAt' in data &&
      'users' in data &&
      'address' in data
    );
  }
}
