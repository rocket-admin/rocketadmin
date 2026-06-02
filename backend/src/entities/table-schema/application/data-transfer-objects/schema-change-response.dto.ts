import { ApiProperty } from '@nestjs/swagger';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/shared/enums/connection-types-enum.js';
import { SchemaChangeStatusEnum, SchemaChangeTypeEnum } from '../../table-schema-change-enums.js';

export class SchemaChangeResponseDto {
	@ApiProperty()
	id: string;

	@ApiProperty()
	connectionId: string;

	@ApiProperty({ required: false, nullable: true })
	batchId: string | null;

	@ApiProperty()
	orderInBatch: number;

	@ApiProperty({ required: false, nullable: true })
	authorId: string | null;

	@ApiProperty({ required: false, nullable: true })
	previousChangeId: string | null;

	@ApiProperty()
	forwardSql: string;

	@ApiProperty({ required: false, nullable: true })
	rollbackSql: string | null;

	@ApiProperty({ required: false, nullable: true })
	userModifiedSql: string | null;

	@ApiProperty({ enum: SchemaChangeStatusEnum })
	status: SchemaChangeStatusEnum;

	@ApiProperty({ enum: SchemaChangeTypeEnum })
	changeType: SchemaChangeTypeEnum;

	@ApiProperty()
	targetTableName: string;

	@ApiProperty({ enum: ConnectionTypesEnum })
	databaseType: ConnectionTypesEnum;

	@ApiProperty({ required: false, nullable: true })
	executionError: string | null;

	@ApiProperty()
	isReversible: boolean;

	@ApiProperty()
	autoRollbackAttempted: boolean;

	@ApiProperty()
	autoRollbackSucceeded: boolean;

	@ApiProperty({
		description:
			'True when the original AI-proposed SQL failed at apply time and the AI was asked to repair it. When true, forwardSql/rollbackSql reflect the repaired statements and the originals are preserved in aiAutoFixOriginalForwardSql/aiAutoFixOriginalRollbackSql.',
	})
	aiAutoFixApplied: boolean;

	@ApiProperty({ required: false, nullable: true })
	aiAutoFixOriginalForwardSql: string | null;

	@ApiProperty({ required: false, nullable: true })
	aiAutoFixOriginalRollbackSql: string | null;

	@ApiProperty({
		required: false,
		nullable: true,
		description: 'Database error returned when the original SQL was attempted, before the AI repaired it.',
	})
	aiAutoFixOriginalError: string | null;

	@ApiProperty()
	userPrompt: string;

	@ApiProperty({ required: false, nullable: true })
	aiSummary: string | null;

	@ApiProperty({ required: false, nullable: true })
	aiReasoning: string | null;

	@ApiProperty()
	createdAt: Date;

	@ApiProperty({ required: false, nullable: true })
	appliedAt: Date | null;

	@ApiProperty({ required: false, nullable: true })
	rolledBackAt: Date | null;
}
