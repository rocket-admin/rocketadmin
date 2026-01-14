import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDashboardDto {
	@ApiProperty({ description: 'Dashboard name' })
	@IsNotEmpty()
	@IsString()
	@MaxLength(255)
	name: string;

	@ApiPropertyOptional({ description: 'Dashboard description' })
	@IsOptional()
	@IsString()
	description?: string;
}
