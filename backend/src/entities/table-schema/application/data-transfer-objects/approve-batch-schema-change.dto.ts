import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class ApproveBatchSchemaChangeDto {
	@ApiProperty({
		type: Boolean,
		required: false,
		default: false,
		description:
			'Must be true to approve a batch containing any non-reversible change. Without it the server rejects the request and lists the offending change ids.',
	})
	@IsOptional()
	@IsBoolean()
	confirmedDestructive?: boolean;
}
