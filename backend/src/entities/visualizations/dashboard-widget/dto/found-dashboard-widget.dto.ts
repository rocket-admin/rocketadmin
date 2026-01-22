import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DashboardWidgetTypeEnum } from '../../../../enums/dashboard-widget-type.enum.js';

export class FoundDashboardWidgetDto {
	@ApiProperty({ description: 'Widget ID' })
	id: string;

	@ApiProperty({ description: 'Widget type', enum: DashboardWidgetTypeEnum })
	widget_type: DashboardWidgetTypeEnum;

	@ApiPropertyOptional({ description: 'Chart type for chart widgets' })
	chart_type: string | null;

	@ApiPropertyOptional({ description: 'Widget name' })
	name: string | null;

	@ApiPropertyOptional({ description: 'Widget description' })
	description: string | null;

	@ApiProperty({ description: 'Position X in grid' })
	position_x: number;

	@ApiProperty({ description: 'Position Y in grid' })
	position_y: number;

	@ApiProperty({ description: 'Widget width in grid units' })
	width: number;

	@ApiProperty({ description: 'Widget height in grid units' })
	height: number;

	@ApiPropertyOptional({ description: 'Visualization options' })
	widget_options: Record<string, unknown> | null;

	@ApiProperty({ description: 'Dashboard ID' })
	dashboard_id: string;

	@ApiPropertyOptional({ description: 'Associated saved query ID' })
	query_id: string | null;
}
