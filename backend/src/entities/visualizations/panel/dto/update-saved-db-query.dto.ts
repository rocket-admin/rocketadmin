import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { DashboardWidgetTypeEnum } from '../../../../enums/dashboard-widget-type.enum.js';

export class UpdateSavedDbQueryDto {
	@ApiPropertyOptional({ type: String, description: 'The name of the saved query' })
	@IsOptional()
	@IsString()
	@MaxLength(255)
	name?: string;

	@ApiPropertyOptional({ type: String, description: 'The description of the saved query' })
	@IsOptional()
	@IsString()
	description?: string;

	@ApiPropertyOptional({ description: 'Widget type', enum: DashboardWidgetTypeEnum })
	@IsOptional()
	@IsEnum(DashboardWidgetTypeEnum)
	widget_type?: DashboardWidgetTypeEnum;

	@ApiPropertyOptional({ description: 'Chart type for chart widgets' })
	@IsOptional()
	@IsString()
	chart_type?: string;

	@ApiPropertyOptional({ description: 'Visualization options as JSON' })
	@IsOptional()
	widget_options?: Record<string, unknown>;

	@ApiPropertyOptional({ type: String, description: 'The SQL query text' })
	@IsOptional()
	@IsString()
	query_text?: string;
}
