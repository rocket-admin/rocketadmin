import { UserRoleEnum } from '../../../user/enums/user-role.enum.js';

export class InviteUserInCompanyAndConnectionGroupDs {
  inviterId: string;
  companyId: string;
  groupId: string;
  invitedUserEmail: string;
  invitedUserCompanyRole: UserRoleEnum;
}
