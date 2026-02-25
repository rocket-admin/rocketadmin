import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class GenerateTableDashboardWithAiDto {
	@ApiPropertyOptional({
		type: Number,
		description: 'Maximum number of panels to generate (1-10)',
		default: 6,
		minimum: 1,
		maximum: 10,
	})
	@IsOptional()
	@IsInt()
	@Min(1)
	@Max(10)
	max_panels?: number;

	@ApiPropertyOptional({
		type: String,
		description: 'Optional name for the dashboard. If not provided, AI will generate one.',
	})
	@IsOptional()
	@IsString()
	@MaxLength(255)
	dashboard_name?: string;
}
