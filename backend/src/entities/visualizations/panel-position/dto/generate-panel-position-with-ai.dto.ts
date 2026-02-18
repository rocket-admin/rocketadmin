import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class GeneratePanelPositionWithAiDto {
	@ApiProperty({
		type: String,
		description: 'Natural language description of the chart you want to create',
		example: 'Show monthly sales by product category as a bar chart',
	})
	@IsNotEmpty()
	@IsString()
	@MaxLength(2000)
	chart_description: string;

	@ApiPropertyOptional({
		type: String,
		description: 'Optional name for the saved query. If not provided, AI will generate one.',
	})
	@IsOptional()
	@IsString()
	@MaxLength(255)
	name?: string;
}
