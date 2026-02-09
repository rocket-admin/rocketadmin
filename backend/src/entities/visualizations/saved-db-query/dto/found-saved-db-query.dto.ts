import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DashboardWidgetTypeEnum } from '../../../../enums/dashboard-widget-type.enum.js';

export class FoundSavedDbQueryDto {
	@ApiProperty({ type: String, description: 'The entity id' })
	id: string;

	@ApiProperty({ type: String, description: 'The name of the saved query' })
	name: string;

	@ApiPropertyOptional({ type: String, description: 'The description of the saved query' })
	description: string | null;

	@ApiProperty({ description: 'Widget type', enum: DashboardWidgetTypeEnum })
	widget_type: DashboardWidgetTypeEnum;

	@ApiPropertyOptional({ description: 'Chart type for chart widgets' })
	chart_type: string | null;

	@ApiPropertyOptional({ description: 'Visualization options' })
	widget_options: Record<string, unknown> | null;

	@ApiProperty({ type: String, description: 'The SQL query text' })
	query_text: string;

	@ApiProperty({ type: String, description: 'The connection id' })
	connection_id: string;

	@ApiProperty({ type: Date, description: 'The creation date' })
	created_at: Date;

	@ApiProperty({ type: Date, description: 'The last update date' })
	updated_at: Date;
}
