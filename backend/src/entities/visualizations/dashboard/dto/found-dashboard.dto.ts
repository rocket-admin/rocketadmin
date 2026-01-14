import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FoundDashboardWidgetDto } from './found-dashboard-widget.dto.js';

export class FoundDashboardDto {
	@ApiProperty({ description: 'Dashboard ID' })
	id: string;

	@ApiProperty({ description: 'Dashboard name' })
	name: string;

	@ApiPropertyOptional({ description: 'Dashboard description' })
	description: string | null;

	@ApiProperty({ description: 'Connection ID' })
	connection_id: string;

	@ApiProperty({ description: 'Creation timestamp' })
	created_at: Date;

	@ApiProperty({ description: 'Last update timestamp' })
	updated_at: Date;

	@ApiPropertyOptional({ description: 'Dashboard widgets', type: FoundDashboardWidgetDto, isArray: true })
	widgets?: FoundDashboardWidgetDto[];
}
