import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class ApproveSchemaChangeDto {
	@ApiProperty({
		type: String,
		required: false,
		description: 'User-edited SQL to run in place of the AI-proposed forward SQL.',
		maxLength: 8000,
	})
	@IsOptional()
	@IsString()
	@MaxLength(8000)
	userModifiedSql?: string;

	@ApiProperty({
		type: Boolean,
		required: false,
		default: false,
		description:
			'Must be true to approve a change where isReversible=false. Without it the server rejects the request.',
	})
	@IsOptional()
	@IsBoolean()
	confirmedDestructive?: boolean;
}
