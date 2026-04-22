import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class GenerateSchemaChangeDto {
	@ApiProperty({
		type: String,
		required: true,
		description: 'Natural-language description of the desired schema change.',
		example: 'Create a products table with id, name and price columns.',
		minLength: 1,
		maxLength: 2000,
	})
	@IsString()
	@IsNotEmpty()
	@MinLength(1)
	@MaxLength(2000)
	userPrompt: string;
}
