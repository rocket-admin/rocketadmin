import { UserRoleEnum } from '../../../user/enums/user-role.enum.js';
import { CompanyInfoEntity } from '../../company-info.entity.js';
import { InvitationInCompanyEntity } from '../invitation-in-company.entity.js';

export interface IInvitationInCompanyRepository {
  createOrUpdateInvitationInCompany(
    companyInfo: CompanyInfoEntity,
    groupId: string | null,
    inviterId: string,
    newUserEmail: string,
    invitedUserRole: UserRoleEnum,
  ): Promise<InvitationInCompanyEntity>;

  deleteOldInvitationsInCompany(companyId: string): Promise<void>;

  findNonExpiredInvitationInCompanyWithUsersByVerificationString(
    verificationString: string,
  ): Promise<InvitationInCompanyEntity>;

  countNonExpiredInvitationsInCompany(companyId: string): Promise<number>;
}
