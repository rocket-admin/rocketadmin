import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

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
