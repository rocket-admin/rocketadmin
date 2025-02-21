import { CompanyInfoEntity } from '../company-info.entity.js';

export interface ICompanyInfoRepository {
  findCompanyInfoWithUsersById(companyId: string): Promise<CompanyInfoEntity>;

  findCompanyWithInvitationsById(companyId: string): Promise<CompanyInfoEntity>;

  findOneCompanyInfoByUserIdWithConnections(userId: string): Promise<CompanyInfoEntity>;

  finOneCompanyInfoByUserId(userId: string): Promise<CompanyInfoEntity>;

  findCompanyInfoByUserId(userId: string): Promise<CompanyInfoEntity>;

  findFullCompanyInfoByUserId(userId: string): Promise<CompanyInfoEntity>;

  findFullCompanyInfoByCompanyId(companyId: string): Promise<CompanyInfoEntity>;

  findCompanyInfosByUserEmail(userEmail: string): Promise<CompanyInfoEntity[]>;

  findUserCompanyWithUsers(userId: string): Promise<CompanyInfoEntity>;
}
