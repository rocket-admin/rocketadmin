import { HttpException, Injectable } from '@nestjs/common';
import { Messages } from '../../../exceptions/text/messages.js';
import { isSaaS } from '../../../helpers/app/is-saas.js';
import { isObjectEmpty } from '../../../helpers/is-object-empty.js';
import { SuccessResponse } from '../../saas-microservice/data-structures/common-responce.ds.js';
import { BaseSaasGatewayService } from './base-saas-gateway.service.js';
import { FoundSassCompanyInfoDS } from './data-structures/found-saas-company-info.ds.js';

@Injectable()
export class SaasCompanyGatewayService extends BaseSaasGatewayService {
  constructor() {
    super();
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

  public async recountUsersInCompanyRequest(companyId: string): Promise<SuccessResponse | null> {
    if (!isSaaS()) {
      return null;
    }
    const result = await this.sendRequestToSaaS(`/webhook/company/${companyId}/recount`, 'POST', null);
    if (result.status > 299) {
      throw new HttpException(
        {
          message: Messages.SAAS_RECOUNT_USERS_IN_COMPANY_FAILED_UNHANDLED_ERROR,
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

  private isDataFoundSassCompanyInfoDS(data: unknown): data is FoundSassCompanyInfoDS {
    return typeof data === 'object' && data !== null && 'id' in data && 'createdAt' in data && 'updatedAt' in data;
  }
}
