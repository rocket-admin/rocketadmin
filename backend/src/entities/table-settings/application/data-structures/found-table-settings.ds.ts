import { ApiProperty } from '@nestjs/swagger';
import { CustomFieldsEntity } from '../../../custom-field/custom-fields.entity.js';
import { TableActionEntity } from '../../../table-actions/table-actions-module/table-action.entity.js';
import { TableWidgetEntity } from '../../../widget/table-widget.entity.js';

export class FoundTableSettingsDs {
	@ApiProperty()
	id: string;

	@ApiProperty()
	table_name: string;

	@ApiProperty({ nullable: true })
	display_name: string | null;

	@ApiProperty({ isArray: true, type: String })
	search_fields: Array<string>;

	@ApiProperty({ isArray: true, type: String })
	excluded_fields: Array<string>;

	@ApiProperty({ isArray: true, type: String })
	identification_fields: Array<string>;

	@ApiProperty({ nullable: true })
	identity_column: string | null;

	@ApiProperty({ isArray: true, type: String })
	readonly_fields: Array<string>;

	@ApiProperty({ isArray: true, type: String, nullable: true })
	sensitive_fields: Array<string> | null;

	@ApiProperty({ isArray: true, type: String })
	sortable_by: Array<string>;

	@ApiProperty({ isArray: true, type: String })
	autocomplete_columns: Array<string>;

	@ApiProperty({ isArray: true, type: String, nullable: true })
	columns_view: Array<string> | null;

	@ApiProperty()
	connection_id: string;

	@ApiProperty({ isArray: true, type: CustomFieldsEntity })
	custom_fields: Array<CustomFieldsEntity>;

	@ApiProperty({ isArray: true, type: TableWidgetEntity })
	table_widgets: Array<TableWidgetEntity>;

	@ApiProperty({ isArray: true, type: TableActionEntity })
	table_actions: Array<TableActionEntity>;

	@ApiProperty()
	can_add: boolean;

	@ApiProperty()
	can_delete: boolean;

	@ApiProperty()
	can_update: boolean;

	@ApiProperty({ nullable: true })
	icon: string | null;

	@ApiProperty()
	allow_csv_export: boolean;

	@ApiProperty()
	allow_csv_import: boolean;

	@ApiProperty({ isArray: true, type: 'string' })
	list_fields: string[];

	@ApiProperty({ nullable: true })
	list_per_page: number | null;

	@ApiProperty()
	ordering: string;

	@ApiProperty({ nullable: true })
	ordering_field: string | null;
}
