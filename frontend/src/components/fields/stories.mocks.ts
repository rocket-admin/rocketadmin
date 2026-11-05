// Fixtures shared by the field-widget stories — the `mockStructure` / `mockWidgetStructure`
// objects every Angular story declared inline.
import type { TableField, TableForeignKey, WidgetStructure } from '@/models/table';

export function mockStructure(overrides: Partial<TableField> = {}): TableField {
	return {
		column_name: 'field_name',
		column_default: null,
		data_type: 'varchar',
		isExcluded: false,
		isSearched: false,
		allow_null: true,
		auto_increment: false,
		character_maximum_length: null,
		...overrides,
	};
}

export function mockWidgetStructure(
	// biome-ignore lint/suspicious/noExplicitAny: widget params are free-form per widget type
	widget_params: Record<string, any> = {},
	overrides: Partial<WidgetStructure> = {},
): WidgetStructure {
	return {
		field_name: 'field_name',
		widget_type: 'Default',
		widget_params,
		name: '',
		description: '',
		...overrides,
	};
}

export function mockRelations(overrides: Partial<TableForeignKey> = {}): TableForeignKey {
	return {
		column_name: 'customer_id',
		constraint_name: 'orders_customer_id_fkey',
		referenced_column_name: 'id',
		referenced_table_name: 'customers',
		...overrides,
	};
}
