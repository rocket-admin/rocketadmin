import { ApiProperty } from '@nestjs/swagger';
import { SignInMethodEnum } from '../enums/sign-in-method.enum.js';
import { SignInStatusEnum } from '../enums/sign-in-status.enum.js';

export class FoundSignInAuditRecordDs {
	@ApiProperty()
	id: string;

	@ApiProperty({ nullable: true })
	email: string | null;

	@ApiProperty({ enum: SignInStatusEnum })
	status: SignInStatusEnum;

	@ApiProperty({ enum: SignInMethodEnum })
	signInMethod: SignInMethodEnum;

	@ApiProperty({ nullable: true })
	ipAddress: string | null;

	@ApiProperty({ nullable: true })
	userAgent: string | null;

	@ApiProperty({ nullable: true })
	failureReason: string | null;

	@ApiProperty()
	createdAt: Date;

	@ApiProperty({ nullable: true })
	userId: string | null;
}
