import { UserRoleEnum } from '../../../user/enums/user-role.enum.js';

export class UpdateUsersCompanyRolesDs {
  companyId: string;
  users: Array<{
    userId: string;
    role: UserRoleEnum;
  }>;
}
