import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSavedDbQueryDto {
	@ApiProperty({ type: String, description: 'The name of the saved query' })
	@IsNotEmpty()
	@IsString()
	@MaxLength(255)
	name: string;

	@ApiProperty({ type: String, description: 'The description of the saved query', required: false })
	@IsOptional()
	@IsString()
	description?: string;

	@ApiProperty({ type: String, description: 'The SQL query text' })
	@IsNotEmpty()
	@IsString()
	query_text: string;
}
