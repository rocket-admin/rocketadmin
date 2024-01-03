import { CompanyInfoEntity } from '../company-info.entity.js';
import { ICompanyInfoRepository } from './company-info-repository.interface.js';

export const companyInfoRepositoryExtension: ICompanyInfoRepository = {
  async findCompanyInfoWithUsersById(companyId: string): Promise<CompanyInfoEntity> {
    return await this.createQueryBuilder('company_info')
      .leftJoinAndSelect('company_info.users', 'users')
      .where('company_info.id = :companyId', { companyId })
      .getOne();
  },

  async findCompanyWithInvitationsById(companyId: string): Promise<CompanyInfoEntity> {
    return await this.createQueryBuilder('company_info')
      .leftJoinAndSelect('company_info.invitations', 'invitations')
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

  async findCompanyInfoByUserId(userId: string): Promise<CompanyInfoEntity> {
    return await this.createQueryBuilder('company_info')
      .leftJoinAndSelect('company_info.users', 'users')
      .where('users.id = :userId', { userId })
      .getOne();
  },

  async findFullCompanyInfoByUserId(userId: string): Promise<CompanyInfoEntity> {
    return await this.createQueryBuilder('company_info')
      .leftJoinAndSelect('company_info.users', 'users')
      .leftJoinAndSelect('company_info.connections', 'connections')
      .leftJoinAndSelect('company_info.invitations', 'invitations')
      .leftJoinAndSelect('connections.groups', 'groups')
      .leftJoinAndSelect('connections.author', 'connection_author')
      .leftJoinAndSelect('groups.users', 'groups_users')
      .where('users.id = :userId', { userId })
      .getOne();
  },

  async findCompanyInfosByUserEmail(userEmail: string): Promise<CompanyInfoEntity[]> {
    return await this.createQueryBuilder('company_info')
      .leftJoinAndSelect('company_info.users', 'users')
      .where('users.email = :userEmail', { userEmail })
      .andWhere('users."externalRegistrationProvider" IS NULL')
      .getMany();
  },
};
