import { ApiProperty } from '@nestjs/swagger';
import { FoundTableCategoryRo } from '../../../table-categories/dto/found-table-category.ro.js';

export class FoundConnectionPropertiesDs {
	@ApiProperty()
	id: string;

	@ApiProperty({ isArray: true, type: String, nullable: true })
	hidden_tables: Array<string> | null;

	@ApiProperty({ required: false })
	connectionId?: string;

	@ApiProperty({ nullable: true, type: String })
	logo_url: string | null;

	@ApiProperty()
	primary_color: string;

	@ApiProperty()
	secondary_color: string;

	@ApiProperty({ nullable: true, type: String })
	hostname: string | null;

	@ApiProperty({ nullable: true, type: String })
	company_name: string | null;

	@ApiProperty()
	tables_audit: boolean;

	@ApiProperty()
	human_readable_table_names: boolean;

	@ApiProperty()
	allow_ai_requests: boolean;

	@ApiProperty({ nullable: true, type: String })
	default_showing_table: string | null;

	@ApiProperty({ isArray: true })
	table_categories: Array<FoundTableCategoryRo>;
}
