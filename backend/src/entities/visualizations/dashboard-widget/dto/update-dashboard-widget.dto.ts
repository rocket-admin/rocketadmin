import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { DashboardWidgetTypeEnum } from '../../../../enums/dashboard-widget-type.enum.js';

export class UpdateDashboardWidgetDto {
	@ApiPropertyOptional({ description: 'Widget type', enum: DashboardWidgetTypeEnum })
	@IsOptional()
	@IsEnum(DashboardWidgetTypeEnum)
	widget_type?: DashboardWidgetTypeEnum;

	@ApiPropertyOptional({ description: 'Widget name' })
	@IsOptional()
	@IsString()
	name?: string;

	@ApiPropertyOptional({ description: 'Widget description' })
	@IsOptional()
	@IsString()
	description?: string;

	@ApiPropertyOptional({ description: 'Position X in grid' })
	@IsOptional()
	@IsInt()
	@Min(0)
	position_x?: number;

	@ApiPropertyOptional({ description: 'Position Y in grid' })
	@IsOptional()
	@IsInt()
	@Min(0)
	position_y?: number;

	@ApiPropertyOptional({ description: 'Widget width in grid units' })
	@IsOptional()
	@IsInt()
	@Min(1)
	@Max(12)
	width?: number;

	@ApiPropertyOptional({ description: 'Widget height in grid units' })
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
