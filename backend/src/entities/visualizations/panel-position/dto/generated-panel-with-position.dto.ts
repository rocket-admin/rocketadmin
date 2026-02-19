import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DashboardWidgetTypeEnum } from '../../../../enums/dashboard-widget-type.enum.js';

export class GeneratedPanelPositionDto {
	@ApiProperty({ description: 'Position X in grid' })
	position_x: number;

	@ApiProperty({ description: 'Position Y in grid' })
	position_y: number;

	@ApiProperty({ description: 'Widget width in grid units' })
	width: number;

	@ApiProperty({ description: 'Widget height in grid units' })
	height: number;

	@ApiProperty({ description: 'Dashboard ID' })
	dashboard_id: string;
}

export class GeneratedPanelWithPositionDto {
	@ApiProperty({ description: 'Panel name' })
	name: string;

	@ApiPropertyOptional({ description: 'Panel description' })
	description: string | null;

	@ApiProperty({ description: 'Widget type', enum: DashboardWidgetTypeEnum })
	widget_type: DashboardWidgetTypeEnum;

	@ApiPropertyOptional({ description: 'Chart type for chart widgets' })
	chart_type: string | null;

	@ApiPropertyOptional({ description: 'Visualization options' })
	widget_options: Record<string, unknown> | null;

	@ApiProperty({ description: 'AI-generated SQL query text' })
	query_text: string;

	@ApiProperty({ description: 'Connection ID' })
	connection_id: string;

	@ApiProperty({ description: 'Panel position configuration', type: GeneratedPanelPositionDto })
	panel_position: GeneratedPanelPositionDto;
}
