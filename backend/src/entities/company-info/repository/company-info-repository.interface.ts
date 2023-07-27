import { CompanyInfoEntity } from '../company-info.entity.js';

export interface ICompanyInfoRepository {
  findCompanyInfoWithUsersById(companyId: string): Promise<CompanyInfoEntity>;
}
