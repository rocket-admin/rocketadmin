import { FoundSassCompanyInfoDS } from '../../../microservices/gateways/saas-gateway.ts/data-structures/found-saas-company-info.ds.js';
import { FoundUserCompanyInfoDs } from '../application/data-structures/found-company-info.ds.js';
import { CompanyInfoEntity } from '../company-info.entity.js';

export function buildFoundCompanyInfoDs(
  companyInfoFromCore: CompanyInfoEntity,
  companyInfoFromSaas: FoundSassCompanyInfoDS | null,
): FoundUserCompanyInfoDs {
  if (!companyInfoFromSaas) {
    return {
      id: companyInfoFromCore.id,
    };
  }
  return {
    id: companyInfoFromCore.id,
    name: companyInfoFromSaas.name,
    additional_info: companyInfoFromSaas.additional_info,
    address: {
      id: companyInfoFromSaas.address?.id,
      city: companyInfoFromSaas.address?.city,
      complement: companyInfoFromSaas.address?.complement,
      country: companyInfoFromSaas.address?.country,
      createdAt: companyInfoFromSaas.address?.createdAt,
      neighborhood: companyInfoFromSaas.address?.neighborhood,
      number: companyInfoFromSaas.address?.number,
      state: companyInfoFromSaas.address?.state,
      street: companyInfoFromSaas.address?.street,
      updatedAt: companyInfoFromSaas.address?.updatedAt,
      zipCode: companyInfoFromSaas.address?.zipCode,
    },
    createdAt: companyInfoFromSaas.createdAt,
    updatedAt: companyInfoFromSaas.updatedAt,
  };
}
