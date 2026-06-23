import { ApiProperty } from '@nestjs/swagger';

export class SitenovaRawQueryResultRO {
	@ApiProperty({
		description: 'Raw result returned by the connected database for the executed statement.',
	})
	result: unknown;
}
