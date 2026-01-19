import { ApiProperty } from '@nestjs/swagger';

export class TestDbQueryResultDto {
	@ApiProperty({ description: 'The query result data' })
	data: Array<Record<string, unknown>>;

	@ApiProperty({ description: 'Query execution time in milliseconds' })
	execution_time_ms: number;
}
