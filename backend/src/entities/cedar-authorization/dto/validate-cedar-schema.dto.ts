import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsObject } from 'class-validator';

export class ValidateCedarSchemaDto {
	@ApiProperty({
		description: 'Cedar schema in JSON format',
		example: {
			RocketAdmin: {
				entityTypes: {},
				actions: {},
			},
		},
	})
	@IsNotEmpty()
	@IsObject()
	cedarSchema: Record<string, unknown>;
}
