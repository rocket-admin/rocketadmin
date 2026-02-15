import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { DashboardWidgetTypeEnum } from '../../../../enums/dashboard-widget-type.enum.js';

export class CreateSavedDbQueryDto {
	@ApiProperty({ type: String, description: 'The name of the saved query' })
	@IsNotEmpty()
	@IsString()
	@MaxLength(255)
	name: string;

	@ApiPropertyOptional({ type: String, description: 'The description of the saved query' })
	@IsOptional()
	@IsString()
	description?: string;

	@ApiProperty({ description: 'Widget type', enum: DashboardWidgetTypeEnum })
	@IsNotEmpty()
	@IsEnum(DashboardWidgetTypeEnum)
	widget_type: DashboardWidgetTypeEnum;

	@ApiPropertyOptional({ description: 'Chart type for chart widgets' })
	@IsOptional()
	@IsString()
	chart_type?: string;

	@ApiPropertyOptional({ description: 'Visualization options as JSON' })
	@IsOptional()
	widget_options?: Record<string, unknown>;

	@ApiProperty({ type: String, description: 'The SQL query text' })
	@IsNotEmpty()
	@IsString()
	query_text: string;
}
