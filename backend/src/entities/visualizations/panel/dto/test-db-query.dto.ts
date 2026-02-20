import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class TestDbQueryDto {
	@ApiProperty({ description: 'The query text to test' })
	@IsString()
	@IsNotEmpty()
	query_text: string;

	@ApiProperty({ description: 'Optional table name for NoSQL databases', required: false })
	@IsString()
	@IsOptional()
	tableName?: string;
}
