import { ApiProperty } from '@nestjs/swagger';
import { UserRoleEnum } from '../../enums/user-role.enum.js';

class UsualRegisterUserDs {
	@ApiProperty()
	email: string;

	@ApiProperty()
	password: string;

	@ApiProperty()
	gclidValue: string;

	@ApiProperty()
	name: string;
}

export class SaasUsualUserRegisterDS extends UsualRegisterUserDs {
	@ApiProperty({ required: true })
	companyId: string;

	@ApiProperty({ required: false, enum: UserRoleEnum })
	userRole?: UserRoleEnum;

	@ApiProperty({ required: false })
	companyName?: string;

	@ApiProperty({
		required: false,
		description:
			'Full URL prefix the confirmation token is appended to (e.g. "https://app.sitenova.com/saas/user/email/verify"). ' +
			'When omitted or not allowed, the legacy frontend link is built instead.',
	})
	emailVerificationLinkBase?: string;
}
