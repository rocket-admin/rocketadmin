import { ApiProperty } from '@nestjs/swagger';

export class ExecuteSavedDbQueryResultDto {
	@ApiProperty({ type: String, description: 'The saved query id' })
	query_id: string;

	@ApiProperty({ type: String, description: 'The saved query name' })
	query_name: string;

	@ApiProperty({ type: Array, description: 'The query execution result' })
	data: Array<Record<string, unknown>>;

	@ApiProperty({ type: Number, description: 'Execution time in milliseconds' })
	execution_time_ms: number;
}
