import { ApiProperty } from '@nestjs/swagger';
import { FoundTableDs } from '../../table/application/data-structures/found-table.ds.js';

export class FoundTableCategoriesWithTablesRo {
	@ApiProperty({ type: String })
	category_id: string;

	@ApiProperty({ type: String })
	category_name: string;

	@ApiProperty({ type: String, nullable: true })
	category_color: string | null;

	@ApiProperty({ isArray: true, type: FoundTableDs })
	tables: Array<FoundTableDs>;
}
