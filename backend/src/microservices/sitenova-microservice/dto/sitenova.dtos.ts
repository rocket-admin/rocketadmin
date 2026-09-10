import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
	ArrayMaxSize,
	ArrayNotEmpty,
	IsArray,
	IsIn,
	IsNotEmpty,
	IsOptional,
	IsString,
	IsUUID,
	MaxLength,
	ValidateNested,
} from 'class-validator';

export class SitenovaBaseDto {
	@ApiProperty({ description: 'Id of the RocketAdmin user the operation is performed on behalf of.' })
	@IsString()
	@IsNotEmpty()
	@IsUUID()
	userId: string;

	@ApiPropertyOptional({ description: 'Master password for connections stored with encryption.' })
	@IsOptional()
	@IsString()
	masterPassword?: string | null;
}

export class SitenovaExecuteRawQueryDto extends SitenovaBaseDto {
	@ApiProperty({ description: 'Raw SQL statement to execute (DDL/DML allowed).' })
	@IsString()
	@IsNotEmpty()
	query: string;

	@ApiPropertyOptional({
		description: 'Optional table/collection name. Required only by engines whose raw-query API is table-scoped.',
	})
	@IsOptional()
	@IsString()
	tableName?: string | null;
}

export class SitenovaValidatePublicReadDto {
	@ApiProperty({ description: 'Table the anonymous read targets.' })
	@IsString()
	@IsNotEmpty()
	tableName: string;

	@ApiPropertyOptional({
		type: [String],
		description: 'When provided, the response includes the publicly readable subset of these columns.',
	})
	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	columnNames?: Array<string>;
}

// --- Row-event bridge (plan 37): universal-backend → core table actions ---------------------------

// Only the row events a generated-site visitor can cause. CUSTOM events are admin-panel buttons
// that need a RocketAdmin user and a Cedar check — deliberately not reachable from here.
export const SITENOVA_ROW_EVENTS = ['ADD_ROW', 'UPDATE_ROW', 'DELETE_ROW'] as const;
export type SitenovaRowEventType = (typeof SITENOVA_ROW_EVENTS)[number];

export class SitenovaRowEventVisitorDto {
	@ApiPropertyOptional({
		nullable: true,
		description: 'The visitor users-row primary key (token uid). Null for a pre-uid grace token.',
	})
	@IsOptional()
	@IsString()
	@MaxLength(255)
	uid?: string | null;

	@ApiPropertyOptional({ nullable: true, description: 'The address the visitor registered with, when known.' })
	@IsOptional()
	@IsString()
	@MaxLength(320)
	email?: string | null;
}

export class SitenovaRowEventDto {
	@ApiProperty({ description: 'Table the visitor wrote.' })
	@IsString()
	@IsNotEmpty()
	@MaxLength(255)
	tableName: string;

	@ApiProperty({ enum: SITENOVA_ROW_EVENTS, description: 'Which row event happened.' })
	@IsIn(SITENOVA_ROW_EVENTS)
	event: SitenovaRowEventType;

	@ApiProperty({
		type: 'array',
		items: { type: 'object', additionalProperties: true },
		description: 'Primary-key objects of the affected rows (one per row). Non-key columns are ignored.',
	})
	@IsArray()
	@ArrayNotEmpty()
	@ArrayMaxSize(100)
	primaryKeys: Array<Record<string, unknown>>;

	@ApiPropertyOptional({ type: SitenovaRowEventVisitorDto, description: 'Who performed the write.' })
	@IsOptional()
	@ValidateNested()
	@Type(() => SitenovaRowEventVisitorDto)
	visitor?: SitenovaRowEventVisitorDto;
}
