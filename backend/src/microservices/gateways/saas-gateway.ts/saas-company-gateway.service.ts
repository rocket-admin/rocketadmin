import { HttpException, Injectable } from '@nestjs/common';
import { BaseSaasGatewayService, SaaSResponse } from './base-saas-gateway.service.js';
import { RegisteredCompanyUserInviteGroupDS } from './data-structures/registered-company-when-user-invite-group.ds.js';
import { isObjectEmpty } from '../../../helpers/is-object-empty.js';
import { UserRoleEnum } from '../../../entities/user/enums/user-role.enum.js';
import { isSaaS } from '../../../helpers/app/is-saas.js';
import { FoundSassCompanyInfoDS } from './data-structures/found-saas-company-info.ds.js';
import { SuccessResponse } from '../../saas-microservice/data-structures/common-responce.ds.js';
import { Messages } from '../../../exceptions/text/messages.js';

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
      userEmail: userEmail?.toLowerCase(),
      gitHubId,
    });

    if (registrationResult.status > 299) {
      throw new HttpException(
        {
          message: Messages.FAILED_REGISTER_COMPANY_AND_INVITE_USER_IN_GROUP_UNHANDLED_ERROR,
          originalMessage: registrationResult?.body?.message ? registrationResult.body.message : undefined,
        },
        registrationResult.status || 500,
      );
    }

    if (isObjectEmpty(registrationResult.body)) {
      return null;
    }
    return {
      companyId: registrationResult.body.id as string,
      userId: registrationResult.body.users[0].id as string,
    };
  }

  public async canInviteMoreUsers(companyId: string): Promise<boolean> {
    if (!isSaaS() || process.env.NODE_ENV === 'test') {
      return true;
    }
    const canInviteMoreUsersResult = await this.sendRequestToSaaS(
      `/webhook/company/invite/check/${companyId}`,
      'GET',
      null,
    );
    return canInviteMoreUsersResult.body.success as boolean;
  }

  public async removeUserFromCompany(companyId: string, userId: string): Promise<SuccessResponse | null> {
    const removalResult = await this.sendRequestToSaaS(`/webhook/company/remove`, 'POST', {
      userId: userId,
      companyId: companyId,
    });
    if (removalResult.status > 299) {
      throw new HttpException(
        {
          message: Messages.FAILED_REMOVE_USER_FROM_COMPANY_UNHANDLED_ERROR,
          originalMessage: removalResult?.body?.message ? removalResult.body.message : undefined,
        },
        removalResult.status,
      );
    }
    if (isObjectEmpty(removalResult.body)) {
      return null;
    }
    return {
      success: removalResult.body.success as boolean,
    };
  }

  public async revokeUserInvitationInCompany(
    companyId: string,
    verification_string: string,
  ): Promise<SuccessResponse | null> {
    const removalResult = await this.sendRequestToSaaS(`/webhook/company/invitation/revoke`, 'POST', {
      verification_string: verification_string,
      companyId: companyId,
    });
    if (removalResult.status > 299) {
      throw new HttpException(
        {
          message: Messages.FAILED_REVOKE_USER_INVITATION_UNHANDLED_ERROR,
          originalMessage: removalResult?.body?.message ? removalResult.body.message : undefined,
        },
        removalResult.status,
      );
    }
    if (isObjectEmpty(removalResult.body)) {
      return null;
    }
    return {
      success: removalResult.body.success as boolean,
    };
  }

  public async registerEmptyCompany(
    userId: string,
    userEmail: string,
    gitHubId: number,
  ): Promise<RegisteredCompanyUserInviteGroupDS | null> {
    return await this.registerCompanyWhenUserInviteInGroup(userId, userEmail?.toLowerCase(), gitHubId);
  }

  public async invitationSentWebhook(
    companyId: string,
    newUserEmail: string,
    userRole: UserRoleEnum,
    inviterId: string,
    verificationString: string,
  ): Promise<void> {
    const { body, status } = await this.sendRequestToSaaS(`/webhook/company/invitation`, 'POST', {
      userEmail: newUserEmail?.toLowerCase(),
      companyId: companyId,
      userRole: userRole,
      inviterId: inviterId,
      verificationString: verificationString,
    });
    if (status > 299) {
      throw new HttpException(
        {
          message: Messages.FAILED_SEND_INVITATION_SAAS_UNHANDLED_ERROR,
          originalMessage: body?.message ? body.message : undefined,
        },
        status,
      );
    }
  }

  public async invitationAcceptedWebhook(
    newUserId: string,
    companyId: string,
    userRole: UserRoleEnum,
    newUserEmail: string,
  ): Promise<SaaSResponse | null> {
    const result = await this.sendRequestToSaaS(`/webhook/company/invitation/accept`, 'POST', {
      newUserId,
      companyId,
      userRole,
      newUserEmail: newUserEmail?.toLowerCase(),
    });
    if (isObjectEmpty(result.body)) {
      return null;
    }
    if (result.status > 299) {
      throw new HttpException(
        {
          message: Messages.FAILED_ACCEPT_INVITATION_SAAS_UNHANDLED_ERROR,
        },
        result.status,
      );
    }
    return {
      status: result.status,
      body: result.body,
    };
  }

  public async getCompanyInfo(companyId: string): Promise<FoundSassCompanyInfoDS | null> {
    const result = await this.sendRequestToSaaS(`/webhook/company/${companyId}`, 'GET', null);
    if (this.isDataFoundSassCompanyInfoDS(result.body)) {
      return result.body;
    }
    return null;
  }

  public async updateCompanyName(companyId: string, newCompanyName: string): Promise<SuccessResponse | null> {
    const result = await this.sendRequestToSaaS(`/webhook/company/update/name`, 'POST', {
      companyId,
      newCompanyName,
    });
    if (result.status > 299) {
      throw new HttpException(
        {
          message: Messages.COMPANY_NAME_UPDATE_FAILED_UNHANDLED_ERROR,
          originalMessage: result?.body?.message ? result.body.message : undefined,
        },
        result.status,
      );
    }
    if (!isObjectEmpty(result.body)) {
      return {
        success: result.body.success as boolean,
      };
    }
    return null;
  }

  public async updateUsersRolesInCompany(
    clearUsersWithNewRoles: Array<{ userId: string; role: UserRoleEnum }>,
    companyId: string,
  ): Promise<SuccessResponse | null> {
    const result = await this.sendRequestToSaaS(`/webhook/company/update/users/roles`, 'POST', {
      clearUsersWithNewRoles,
      companyId,
    });

    if (result.status > 299) {
      throw new HttpException(
        {
          message: Messages.SAAS_UPDATE_USERS_ROLES_FAILED_UNHANDLED_ERROR,
          originalMessage: result?.body?.message ? result.body.message : undefined,
        },
        result.status,
      );
    }

    if (!isObjectEmpty(result.body)) {
      return {
        success: result.body.success as boolean,
      };
    }
    return null;
  }

  public async deleteCompany(companyId: string): Promise<SuccessResponse | null> {
    const result = await this.sendRequestToSaaS(`/webhook/company/${companyId}`, 'DELETE', null);
    if (result.status > 299) {
      throw new HttpException(
        {
          message: Messages.SAAS_DELETE_COMPANY_FAILED_UNHANDLED_ERROR,
          originalMessage: result?.body?.message ? result.body.message : undefined,
        },
        result.status,
      );
    }
    if (!isObjectEmpty(result.body)) {
      return {
        success: result.body.success as boolean,
      };
    }
    return null;
  }

  public async updateCompany2faStatus(companyId: string, is2faEnabled: boolean): Promise<SuccessResponse | null> {
    const result = await this.sendRequestToSaaS(`/webhook/company/update/2fa`, 'POST', {
      companyId,
      is2faEnabled,
    });
    if (result.status > 299) {
      throw new HttpException(
        {
          message: Messages.SAAS_UPDATE_2FA_STATUS_FAILED_UNHANDLED_ERROR,
          originalMessage: result?.body?.message ? result.body.message : undefined,
        },
        result.status,
      );
    }
    if (!isObjectEmpty(result.body)) {
      return {
        success: result.body.success as boolean,
      };
    }
    return null;
  }

  public async suspendUsersInCompany(companyId: string, userIds: Array<string>): Promise<SuccessResponse | null> {
    const result = await this.sendRequestToSaaS(`/webhook/company/suspend/users`, 'POST', {
      companyId,
      userIds,
    });
    if (result.status > 299) {
      throw new HttpException(
        {
          message: Messages.SAAS_SUSPEND_USERS_FAILED_UNHANDLED_ERROR,
          originalMessage: result?.body?.message ? result.body.message : undefined,
        },
        result.status,
      );
    }
    if (!isObjectEmpty(result.body)) {
      return {
        success: result.body.success as boolean,
      };
    }
    return null;
  }

  public async unSuspendUsersInCompany(companyId: string, userIds: Array<string>): Promise<SuccessResponse | null> {
    const result = await this.sendRequestToSaaS(`/webhook/company/unsuspend/users`, 'POST', {
      companyId,
      userIds,
    });
    if (result.status > 299) {
      throw new HttpException(
        {
          message: Messages.SAAS_UNSUSPEND_USERS_FAILED_UNHANDLED_ERROR,
          originalMessage: result?.body?.message ? result.body.message : undefined,
        },
        result.status,
      );
    }
    if (!isObjectEmpty(result.body)) {
      return {
        success: result.body.success as boolean,
      };
    }
    return null;
  }

  public async getCompanyIdByCustomDomain(customCompanyDomain: string): Promise<string | null> {
    const result = await this.sendRequestToSaaS(`/webhook/company/domain/${customCompanyDomain}/`, 'GET', null);
    if (result.status > 299) {
      throw new HttpException(
        {
          message: Messages.SAAS_GET_COMPANY_ID_BY_CUSTOM_DOMAIN_FAILED_UNHANDLED_ERROR,
          originalMessage: result?.body?.message ? result.body.message : undefined,
        },
        result.status,
      );
    }
    if (!isObjectEmpty(result.body)) {
      return result.body.companyId as string;
    }
    return null;
  }

  public async getCompanyCustomDomainById(companyId: string): Promise<string | null> {
    if (!isSaaS()) {
      return null;
    }
    const result = await this.sendRequestToSaaS(`/webhook/company/${companyId}/domain/`, 'GET', null);
    if (result.status > 299) {
      throw new HttpException(
        {
          message: Messages.SAAS_GET_COMPANY_CUSTOM_DOMAIN_BY_ID_FAILED_UNHANDLED_ERROR,
          originalMessage: result?.body?.message ? result.body.message : undefined,
        },
        result.status,
      );
    }
    if (!isObjectEmpty(result.body)) {
      return result.body.customCompanyDomain as string;
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
