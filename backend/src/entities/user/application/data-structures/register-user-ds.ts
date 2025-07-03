import { UserRoleEnum } from '../../enums/user-role.enum.js';

export class RegisterUserDs {
  gclidValue: string;
  email: string;
  password: string;
  isActive: boolean;
  name: string;
  role?: UserRoleEnum;
  samlNameId?: string;
}
