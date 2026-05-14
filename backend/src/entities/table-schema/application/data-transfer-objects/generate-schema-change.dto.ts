import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

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

	@ApiProperty({
		type: String,
		required: false,
		nullable: true,
		description:
			'Optional thread ID to continue an existing conversation. When supplied, prior turns are prepended to the AI prompt, giving the model context for iterative refinement (e.g. "now also add an index", "rename it to created_at"). Omit to start a fresh thread; the returned threadId can be passed back on the next call.',
	})
	@IsOptional()
	@IsUUID()
	threadId?: string;
}
