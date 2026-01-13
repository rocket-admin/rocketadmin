import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateSavedDbQueryDto {
	@ApiProperty({ type: String, description: 'The name of the saved query', required: false })
	@IsOptional()
	@IsString()
	@MaxLength(255)
	name?: string;

	@ApiProperty({ type: String, description: 'The description of the saved query', required: false })
	@IsOptional()
	@IsString()
	description?: string;

	@ApiProperty({ type: String, description: 'The SQL query text', required: false })
	@IsOptional()
	@IsString()
	query_text?: string;
}
