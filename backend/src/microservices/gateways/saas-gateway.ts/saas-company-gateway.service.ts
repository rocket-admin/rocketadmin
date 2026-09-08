import { Injectable } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { ExternalServiceException } from '../../../exceptions/custom-exceptions/external-service-exception.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { isSaaS } from '../../../helpers/app/is-saas.js';
import { isObjectEmpty } from '../../../helpers/is-object-empty.js';
import { SuccessResponse } from '../../saas-microservice/data-structures/common-responce.ds.js';
import { BaseSaasGatewayService, describeSaasErrorBody } from './base-saas-gateway.service.js';
import { FoundSassCompanyInfoDS } from './data-structures/found-saas-company-info.ds.js';

@Injectable()
export class SaasCompanyGatewayService extends BaseSaasGatewayService {
	// Returns null both when the saas has no such company AND when the call failed for any
	// other reason (401/5xx/unexpected body) — every caller reports that null as
	// COMPANY_NOT_FOUND, so the real reason is logged here before it is lost.
	public async getCompanyInfo(companyId: string): Promise<FoundSassCompanyInfoDS | null> {
		const result = await this.sendRequestToSaaS(`/webhook/company/${companyId}/`, 'GET', null);
		if (!result) {
			return null;
		}
		if (this.isDataFoundSassCompanyInfoDS(result.body)) {
			return result.body;
		}
		if (result.status > 299) {
			// The HTTP failure itself was already logged and sent to Sentry by the base gateway;
			// this line only ties it to the user-facing consequence.
			this.logger.warn(
				`SaaS company lookup for company ${companyId} returned HTTP ${result.status}${describeSaasErrorBody(result.body)}; callers will report COMPANY_NOT_FOUND`,
			);
			return null;
		}
		// A 2xx that is not a company is a contract break between the two services — nothing
		// upstream reports it, so it is captured here.
		const message = `SaaS company lookup for company ${companyId} returned HTTP ${result.status} with an unexpected body (keys: ${Object.keys(result.body ?? {}).join(', ') || 'none'}); callers will report COMPANY_NOT_FOUND`;
		this.logger.warn(message);
		Sentry.withScope((scope) => {
			scope.setLevel('warning');
			scope.setTag('saas_lookup', 'company');
			scope.setTag('company_id', companyId);
			scope.setFingerprint(['saas-company-lookup-unexpected-body']);
			Sentry.captureMessage(message);
		});
		return null;
	}

	public async deleteCompany(companyId: string): Promise<SuccessResponse | null> {
		const result = await this.sendRequestToSaaS(`/webhook/company/${companyId}/`, 'DELETE', null);
		if (!result) {
			return null;
		}
		if (result.status > 299) {
			throw new ExternalServiceException(
				Messages.SAAS_DELETE_COMPANY_FAILED_UNHANDLED_ERROR,
				result.status,
				result?.body?.message ? (result.body.message as string) : undefined,
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
		if (!result) {
			return null;
		}
		if (result.status > 299) {
			throw new ExternalServiceException(
				Messages.SAAS_GET_COMPANY_ID_BY_CUSTOM_DOMAIN_FAILED_UNHANDLED_ERROR,
				result.status,
				result?.body?.message ? (result.body.message as string) : undefined,
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
		if (!result) {
			return null;
		}
		if (result.status > 299) {
			throw new ExternalServiceException(
				Messages.SAAS_GET_COMPANY_CUSTOM_DOMAIN_BY_ID_FAILED_UNHANDLED_ERROR,
				result.status,
				result?.body?.message ? (result.body.message as string) : undefined,
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
		const result = await this.sendRequestToSaaS(`/webhook/company/${companyId}/recount/`, 'POST', null);
		if (!result) {
			return null;
		}
		if (result.status > 299) {
			throw new ExternalServiceException(
				Messages.SAAS_RECOUNT_USERS_IN_COMPANY_FAILED_UNHANDLED_ERROR,
				result.status,
				result?.body?.message ? (result.body.message as string) : undefined,
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
