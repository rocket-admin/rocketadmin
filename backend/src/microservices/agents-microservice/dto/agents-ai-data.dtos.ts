import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';

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
