import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateDashboardDto {
	@ApiPropertyOptional({ description: 'Dashboard name' })
	@IsOptional()
	@IsString()
	@MaxLength(255)
	name?: string;

	@ApiPropertyOptional({ description: 'Dashboard description' })
	@IsOptional()
	@IsString()
	description?: string;
}
