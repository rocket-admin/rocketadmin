import { UserRoleEnum } from '../../../entities/user/enums/user-role.enum.js';

export class AddRemoveCompanyIdToUserDS {
  userId: string;
  companyId: string;
  userRole: UserRoleEnum;
}
