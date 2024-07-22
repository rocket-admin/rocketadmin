import { Encryptor } from '../../../../helpers/encryption/encryptor.js';
import { UserRoleEnum } from '../../../user/enums/user-role.enum.js';
import { CompanyInfoEntity } from '../../company-info.entity.js';
import { InvitationInCompanyEntity } from '../invitation-in-company.entity.js';
import { IInvitationInCompanyRepository } from './invitation-repository.interface.js';

export const invitationInCompanyCustomRepositoryExtension: IInvitationInCompanyRepository = {
  async createOrUpdateInvitationInCompany(
    companyInfo: CompanyInfoEntity,
    groupId: string | null,
    inviterId: string,
    newUserEmail: string,
    invitedUserRole: UserRoleEnum,
  ): Promise<InvitationInCompanyEntity> {
    const qb = this.createQueryBuilder('invitation_in_company')
      .leftJoinAndSelect('invitation_in_company.company', 'company')
      .where('company.id = :companyId', { companyId: companyInfo.id })
      .andWhere('invitation_in_company.invitedUserEmail = :newUserEmail', { newUserEmail });
    const foundInvitation = await qb.getOne();
    if (foundInvitation) {
      await this.remove(foundInvitation);
    }
    const newInvitation = new InvitationInCompanyEntity();
    newInvitation.verification_string = Encryptor.generateRandomString();
    newInvitation.company = companyInfo;
    newInvitation.groupId = groupId ? groupId : null;
    newInvitation.inviterId = inviterId;
    newInvitation.invitedUserEmail = newUserEmail;
    newInvitation.role = invitedUserRole;
    return await this.save(newInvitation);
  },

  async deleteOldInvitationsInCompany(companyId: string): Promise<void> {
    const qb = this.createQueryBuilder('invitation_in_company')
      .leftJoinAndSelect('invitation_in_company.company', 'company')
      .where('company.id = :companyId', { companyId })
      .andWhere("invitation_in_company.createdAt < NOW() - INTERVAL '1 day'");
    const foundInvitations = await qb.getMany();
    if (foundInvitations.length) {
      await this.remove(foundInvitations);
    }
  },

  async findNonExpiredInvitationInCompanyWithUsersByVerificationString(
    verificationString: string,
  ): Promise<InvitationInCompanyEntity> {
    const qb = this.createQueryBuilder('invitation_in_company')
      .leftJoinAndSelect('invitation_in_company.company', 'company')
      .leftJoinAndSelect('company.users', 'users')
      .where("invitation_in_company.createdAt > NOW() - INTERVAL '1 day'")
      .where('invitation_in_company.verification_string = :verificationString', { verificationString });
    return await qb.getOne();
  },
};
