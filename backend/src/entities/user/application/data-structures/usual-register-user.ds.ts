export class UsualRegisterUserDs {
  email: string;
  password: string;
  gclidValue: string;
  name: string;
}

export class SaasUsualUserRegisterDS extends UsualRegisterUserDs {
  companyId?: string;
}
