import { decryptConnectionsCredentialsAsync } from '../../connection/utils/decrypt-connection-credentials-async.js';
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
		const result = await this.createQueryBuilder('company_info')
			.leftJoinAndSelect('company_info.users', 'users')
			.leftJoinAndSelect('company_info.connections', 'connections')
			.where('users.id = :userId', { userId })
			.getOne();
		if (result?.connections?.length) {
			await decryptConnectionsCredentialsAsync(result.connections);
		}
		return result;
	},

	async findCompanyInfoByUserId(userId: string): Promise<CompanyInfoEntity> {
		return await this.createQueryBuilder('company_info')
			.leftJoinAndSelect('company_info.users', 'users')
			.where('users.id = :userId', { userId })
			.getOne();
	},

	async findUserCompanyWithUsers(userId: string): Promise<CompanyInfoEntity> {
		return await this.createQueryBuilder('company_info')
			.leftJoinAndSelect('company_info.users', 'current_user')
			.leftJoinAndSelect('company_info.users', 'users')
			.where('current_user.id = :userId', { userId })
			.getOne();
	},

	async findCompanyInfoByCompanyIdWithoutConnections(companyId: string): Promise<CompanyInfoEntity> {
		return await this.createQueryBuilder('company_info')
			.leftJoinAndSelect('company_info.users', 'current_user')
			.leftJoinAndSelect('company_info.users', 'users')
			.leftJoinAndSelect('company_info.invitations', 'invitations')
			.where('company_info.id = :companyId', { companyId })
			.getOne();
	},

	// returns groups and connections where user is invited
	async findFullCompanyInfoByUserId(userId: string): Promise<CompanyInfoEntity> {
		const result = await this.createQueryBuilder('company_info')
			.leftJoinAndSelect('company_info.users', 'current_user')
			.leftJoinAndSelect('company_info.users', 'users')
			.leftJoinAndSelect('company_info.connections', 'connections')
			.leftJoinAndSelect('company_info.invitations', 'invitations')
			.leftJoinAndSelect('connections.groups', 'groups')
			.leftJoinAndSelect('connections.author', 'connection_author')
			.leftJoinAndSelect('groups.users', 'groups_users')
			.where('current_user.id = :userId', { userId })
			.getOne();
		if (result?.connections?.length) {
			await decryptConnectionsCredentialsAsync(result.connections);
		}
		return result;
	},

	async findCompanyInfosByUserEmail(userEmail: string): Promise<CompanyInfoEntity[]> {
		return await this.createQueryBuilder('company_info')
			.leftJoinAndSelect('company_info.users', 'users')
			.where('users.email = :userEmail', { userEmail: userEmail?.toLowerCase() })
			.andWhere('users."externalRegistrationProvider" IS NULL')
			.getMany();
	},
};
