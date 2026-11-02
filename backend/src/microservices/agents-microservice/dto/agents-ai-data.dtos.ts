import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
	ArrayMaxSize,
	ArrayMinSize,
	IsArray,
	IsInt,
	IsNotEmpty,
	IsNotEmptyObject,
	IsObject,
	IsOptional,
	IsString,
	IsUUID,
	Min,
} from 'class-validator';

export class AiDataRequestBaseDto {
	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	@IsUUID()
	userId: string;

	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	masterPassword?: string | null;
}

export class GetAiTableStructureDto extends AiDataRequestBaseDto {
	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	tableName: string;
}

export class ExecuteAiRawQueryDto extends AiDataRequestBaseDto {
	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	tableName: string;

	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	query: string;
}

export class GetAiSampleRowsDto extends AiDataRequestBaseDto {
	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	tableName: string;

	@ApiPropertyOptional({ description: 'Max sample rows to return. Clamped server-side to 5.' })
	@IsOptional()
	@IsInt()
	@Min(1)
	limit?: number;
}

export class ExecuteAiAggregationPipelineDto extends AiDataRequestBaseDto {
	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	tableName: string;

	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	pipeline: string;
}

// Row writes for the SiteNova chat data agent (sitenova plan 85). Each call names one table and
// at most AI_ROW_WRITE_MAX_ROWS rows, so one model tool call has a bounded blast radius.
export const AI_ROW_WRITE_MAX_ROWS = 100;

export class InsertAiRowsDto extends AiDataRequestBaseDto {
	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	tableName: string;

	@ApiProperty({
		type: 'array',
		items: { type: 'object', additionalProperties: true },
		description: `Rows to insert, column name to value. 1 to ${AI_ROW_WRITE_MAX_ROWS} rows.`,
	})
	@IsArray()
	@ArrayMinSize(1)
	@ArrayMaxSize(AI_ROW_WRITE_MAX_ROWS)
	@IsObject({ each: true })
	rows: Array<Record<string, unknown>>;
}

export class UpdateAiRowsDto extends AiDataRequestBaseDto {
	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	tableName: string;

	@ApiProperty({
		type: 'array',
		items: { type: 'object', additionalProperties: true },
		description: `Primary keys of the rows to update. 1 to ${AI_ROW_WRITE_MAX_ROWS} keys.`,
	})
	@IsArray()
	@ArrayMinSize(1)
	@ArrayMaxSize(AI_ROW_WRITE_MAX_ROWS)
	@IsObject({ each: true })
	primaryKeys: Array<Record<string, unknown>>;

	@ApiProperty({
		type: 'object',
		additionalProperties: true,
		description: 'Column name to new value, applied to every listed row.',
	})
	@IsObject()
	@IsNotEmptyObject()
	newValues: Record<string, unknown>;
}

export class DeleteAiRowsDto extends AiDataRequestBaseDto {
	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	tableName: string;

	@ApiProperty({
		type: 'array',
		items: { type: 'object', additionalProperties: true },
		description: `Primary keys of the rows to delete. 1 to ${AI_ROW_WRITE_MAX_ROWS} keys.`,
	})
	@IsArray()
	@ArrayMinSize(1)
	@ArrayMaxSize(AI_ROW_WRITE_MAX_ROWS)
	@IsObject({ each: true })
	primaryKeys: Array<Record<string, unknown>>;
}
