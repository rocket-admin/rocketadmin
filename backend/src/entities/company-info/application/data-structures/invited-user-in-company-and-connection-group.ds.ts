import { UserRoleEnum } from '../../../user/enums/user-role.enum.js';

export class InvitedUserInCompanyAndConnectionGroupDs {
  companyId: string;
  groupId: string;
  email: string;
  role: UserRoleEnum;
}
