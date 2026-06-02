import { ApiProperty } from '@nestjs/swagger';
import { SchemaChangeResponseDto } from './schema-change-response.dto.js';

export class SchemaChangeBatchResponseDto {
	@ApiProperty({
		required: false,
		nullable: true,
		description:
			'Identifier shared by every change generated from a single user prompt. Use it to approve/reject/rollback the entire batch in one call. Null when the AI did not propose any change (e.g. it returned a clarifying question instead — see assistantMessage).',
	})
	batchId: string | null;

	@ApiProperty({
		type: [SchemaChangeResponseDto],
		description:
			'Generated changes ordered by orderInBatch (dependency order — parents first). Empty when the AI returned a clarifying question instead of a proposal.',
	})
	changes: SchemaChangeResponseDto[];

	@ApiProperty({
		required: false,
		nullable: true,
		description:
			'Conversation thread ID. Present when the request used or created a chat thread. Pass it back as the threadId query param on subsequent generate calls to continue the conversation with full prior context.',
	})
	threadId?: string | null;

	@ApiProperty({
		required: false,
		nullable: true,
		description:
			"Free-text reply from the AI when it could not propose any change and needs more information from the user (e.g. a clarifying question). When present, batchId is null and changes is empty; resubmit the user's answer with the same threadId to continue the conversation.",
	})
	assistantMessage?: string | null;
}
