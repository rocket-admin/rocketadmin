export class UsualRegisterUserDs {
  email: string;
  password: string;
  gclidValue: string;
  name: string;
}

export class SaasUsualUserRegisterDS extends UsualRegisterUserDs {
  companyId?: string;
}

export class RegisterInvitedUserDS {
  email: string;
  password: string;
  name: string;
  companyId: string;
}
