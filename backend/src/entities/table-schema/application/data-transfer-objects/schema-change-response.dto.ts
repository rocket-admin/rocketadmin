import { ApiProperty } from '@nestjs/swagger';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/shared/enums/connection-types-enum.js';
import { SchemaChangeStatusEnum, SchemaChangeTypeEnum } from '../../table-schema-change-enums.js';

export class SchemaChangeResponseDto {
	@ApiProperty()
	id: string;

	@ApiProperty()
	connectionId: string;

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

	@ApiProperty()
	userPrompt: string;

	@ApiProperty({ required: false, nullable: true })
	aiSummary: string | null;

	@ApiProperty({ required: false, nullable: true })
	aiReasoning: string | null;

	@ApiProperty({ required: false, nullable: true })
	aiModelUsed: string | null;

	@ApiProperty()
	createdAt: Date;

	@ApiProperty({ required: false, nullable: true })
	appliedAt: Date | null;

	@ApiProperty({ required: false, nullable: true })
	rolledBackAt: Date | null;
}
