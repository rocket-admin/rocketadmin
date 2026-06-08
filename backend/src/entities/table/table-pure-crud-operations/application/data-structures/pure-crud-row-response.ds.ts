import { ApiProperty } from '@nestjs/swagger';

export class PureCrudRowResponseDs {
	@ApiProperty({ type: Object })
	row: Record<string, unknown>;
}
