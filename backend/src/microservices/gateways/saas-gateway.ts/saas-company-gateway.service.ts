import { HttpException, Injectable } from '@nestjs/common';
import { Messages } from '../../../exceptions/text/messages.js';
import { isSaaS } from '../../../helpers/app/is-saas.js';
import { isObjectEmpty } from '../../../helpers/is-object-empty.js';
import { SuccessResponse } from '../../saas-microservice/data-structures/common-responce.ds.js';
import { BaseSaasGatewayService } from './base-saas-gateway.service.js';
import { FoundSassCompanyInfoDS } from './data-structures/found-saas-company-info.ds.js';
import { RegisteredCompanyUserInviteGroupDS } from './data-structures/registered-company-when-user-invite-group.ds.js';

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

  public async registerEmptyCompany(
    userId: string,
    userEmail: string,
    gitHubId: number,
  ): Promise<RegisteredCompanyUserInviteGroupDS | null> {
    return await this.registerCompanyWhenUserInviteInGroup(userId, userEmail?.toLowerCase(), gitHubId);
  }

  public async getCompanyInfo(companyId: string): Promise<FoundSassCompanyInfoDS | null> {
    const result = await this.sendRequestToSaaS(`/webhook/company/${companyId}`, 'GET', null);
    if (this.isDataFoundSassCompanyInfoDS(result.body)) {
      return result.body;
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
      'createdAt' in data &&
      'updatedAt' in data
    );
  }
}
