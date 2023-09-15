import { CompanyInfoEntity } from '../company-info.entity.js';
import { ICompanyInfoRepository } from './company-info-repository.interface.js';

export const companyInfoRepositoryExtension: ICompanyInfoRepository = {
  async findCompanyInfoWithUsersById(companyId: string): Promise<CompanyInfoEntity> {
    return await this.createQueryBuilder('company_info')
      .leftJoinAndSelect('company_info.users', 'users')
      .where('company_info.id = :companyId', { companyId })
      .getOne();
  },

  async findOneCompanyInfoByUserIdWithConnections(userId: string): Promise<CompanyInfoEntity> {
    return await this.createQueryBuilder('company_info')
      .leftJoinAndSelect('company_info.users', 'users')
      .leftJoinAndSelect('company_info.connections', 'connections')
      .where('users.id = :userId', { userId })
      .getOne();
  },
};
