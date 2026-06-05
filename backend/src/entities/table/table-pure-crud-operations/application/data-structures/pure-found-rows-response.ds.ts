import { ApiProperty } from '@nestjs/swagger';
import { RowsPaginationDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/rows-pagination.ds.js';

export class PureFoundRowsResponseDs {
	@ApiProperty({ isArray: true, type: Object })
	rows: Array<Record<string, unknown>>;

	@ApiProperty({ type: RowsPaginationDS })
	pagination: RowsPaginationDS;
}
