import { UserRoleEnum } from '../../enums/user-role.enum.js';

export class RegisterUserDs {
	gclidValue: string | null;
	email: string;
	password: string | null;
	isActive: boolean;
	name: string | null;
	role?: UserRoleEnum;
	samlNameId?: string;
}
