import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FoundPanelPositionDto {
	@ApiProperty({ description: 'Widget ID' })
	id: string;

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

	@ApiPropertyOptional({ description: 'Associated saved query ID' })
	query_id: string | null;
}
