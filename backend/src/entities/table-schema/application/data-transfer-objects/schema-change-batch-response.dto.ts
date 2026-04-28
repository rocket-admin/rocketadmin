import { ApiProperty } from '@nestjs/swagger';
import { SchemaChangeResponseDto } from './schema-change-response.dto.js';

export class SchemaChangeBatchResponseDto {
	@ApiProperty({
		description:
			'Identifier shared by every change generated from a single user prompt. Use it to approve/reject/rollback the entire batch in one call.',
	})
	batchId: string;

	@ApiProperty({
		type: [SchemaChangeResponseDto],
		description: 'Generated changes ordered by orderInBatch (dependency order — parents first).',
	})
	changes: SchemaChangeResponseDto[];
}
