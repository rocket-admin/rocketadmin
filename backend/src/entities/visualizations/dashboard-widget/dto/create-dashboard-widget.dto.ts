import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class CreateDashboardWidgetDto {
	@ApiPropertyOptional({ description: 'Associated saved query ID' })
	@IsOptional()
	@IsUUID()
	query_id?: string;

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
}
