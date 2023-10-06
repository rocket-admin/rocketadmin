import { UserRoleEnum } from "../../enums/user-role.enum.js";

export class UsualRegisterUserDs {
  email: string;
  password: string;
  gclidValue: string;
  name: string;
}

export class SaasUsualUserRegisterDS extends UsualRegisterUserDs {
  companyId?: string;
  userRole?: UserRoleEnum;
}

export class RegisterInvitedUserDS {
  email: string;
  password: string;
  name: string;
  companyId: string;
}
