import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { DashboardWidgetTypeEnum } from '../../../../enums/dashboard-widget-type.enum.js';

export class CreateDashboardWidgetDto {
	@ApiProperty({ description: 'Widget type', enum: DashboardWidgetTypeEnum })
	@IsNotEmpty()
	@IsEnum(DashboardWidgetTypeEnum)
	widget_type: DashboardWidgetTypeEnum;

	@ApiPropertyOptional({ description: 'Chart type for chart widgets' })
	@IsOptional()
	@IsString()
	chart_type?: string;

	@ApiPropertyOptional({ description: 'Widget name' })
	@IsOptional()
	@IsString()
	name?: string;

	@ApiPropertyOptional({ description: 'Widget description' })
	@IsOptional()
	@IsString()
	description?: string;

	@ApiPropertyOptional({ description: 'Position X in grid', default: 0 })
	@IsOptional()
	@IsInt()
	@Min(0)
	position_x?: number;

	@ApiPropertyOptional({ description: 'Position Y in grid', default: 0 })
	@IsOptional()
	@IsInt()
	@Min(0)
	position_y?: number;

	@ApiPropertyOptional({ description: 'Widget width in grid units', default: 4 })
	@IsOptional()
	@IsInt()
	@Min(1)
	@Max(12)
	width?: number;

	@ApiPropertyOptional({ description: 'Widget height in grid units', default: 3 })
	@IsOptional()
	@IsInt()
	@Min(1)
	@Max(12)
	height?: number;

	@ApiPropertyOptional({ description: 'Visualization options as JSON' })
	@IsOptional()
	widget_options?: Record<string, unknown>;

	@ApiPropertyOptional({ description: 'Associated saved query ID' })
	@IsOptional()
	@IsUUID()
	query_id?: string;
}
