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

	@ApiProperty({
		required: false,
		nullable: true,
		description:
			'Conversation thread ID. Present when the request used or created a chat thread. Pass it back as the threadId query param on subsequent generate calls to continue the conversation with full prior context.',
	})
	threadId?: string | null;
}
