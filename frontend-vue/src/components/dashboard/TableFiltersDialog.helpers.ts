// Filter-widget resolution shared by the filters dialog, the saved-filters dialog and the
// saved-filters panel. The three Angular components each repeated `UIwidgets`, `inputs`,
// `isWidget()`, `getInputType()` and `getComparatorType()`; they live here once.
import JSON5 from 'json5';
import type { Component } from 'vue';
import {
	type FilterComparatorType,
	getComparatorFamily,
	getFilterComparatorType,
} from '@/components/fields/filter/comparatorType';
import { UIwidgets as FilterUIwidgets, filterTypes } from '@/consts/filter-types';
import { UIwidgets as EditUIwidgets } from '@/consts/record-edit-types';
import type { TableField, TableForeignKey, Widget, WidgetStructure } from '@/models/table';

/** A widget entry: a lazy component, or `''` for `Default` (no widget). */
export type FilterWidgetComponent = Component | string;

/** `{ ...EditUIwidgets, ...FilterUIwidgets }`: a widget type with no filter falls back to its edit widget. */
export const FILTER_UI_WIDGETS: Readonly<Record<string, FilterWidgetComponent>> = {
	...EditUIwidgets,
	...FilterUIwidgets,
};

/** Widgets keyed by column, `widget_params` parsed (the table view's `tableData.widgets`). */
export type WidgetsByField = Record<string, WidgetStructure>;

/** Foreign keys keyed by column (the table view's `tableData.foreignKeys`). */
export type ForeignKeysByField = Record<string, TableForeignKey>;

/** Filters as stored in the URL and in saved filters: `{ column: { comparator: value } }`. */
export type FiltersByField = Record<string, Record<string, unknown>>;

/** The comparator family a host shows next to a widget: `getComparatorType()` in Angular. */
export type ComparatorFamily = ReturnType<typeof getComparatorFamily>;

/** `filterTypes[currentConnection.type]`: column type → filter widget for the connection's database. */
export function filterInputsFor(connectionType: string | null | undefined): Record<string, Component> {
	return (filterTypes as Record<string, Record<string, Component>>)[connectionType ?? ''] ?? {};
}

/**
 * The filters dialog's `setWidgets()`: widgets keyed by column with `widget_params` parsed (JSON5),
 * `'// No settings required'` becoming `''`. Accepts the widgets as an array or already keyed, as
 * the table view hands over either.
 */
export function widgetsByField(
	widgets: (Widget | WidgetStructure)[] | Record<string, Widget | WidgetStructure> | null | undefined,
): WidgetsByField {
	const list: (Widget | WidgetStructure)[] = Array.isArray(widgets) ? widgets : Object.values(widgets ?? {});
	return Object.fromEntries(
		list.map((widget) => {
			const params: unknown = widget.widget_params;
			let parsed: unknown = params;
			if (typeof params === 'string') {
				if (params === '// No settings required') parsed = '';
				else {
					try {
						parsed = JSON5.parse(params);
					} catch {
						parsed = '';
					}
				}
			}
			return [widget.field_name, { ...widget, widget_params: parsed } as WidgetStructure];
		}),
	);
}

/** Columns by name. */
export function structureByField(structure: TableField[] | null | undefined): Record<string, TableField> {
	return Object.fromEntries((structure ?? []).map((field) => [field.column_name, field]));
}

export interface FilterWidgetContext {
	/** Parsed widgets by column; `null`/`{}` when the table has none. */
	widgets: WidgetsByField | null | undefined;
	/** `filterInputsFor(connection.type)`. */
	inputs: Record<string, Component>;
	/** `getTableTypes(structure, foreignKeysList)`. */
	tableTypes: Record<string, string>;
}

export function isWidget(widgets: WidgetsByField | null | undefined, column: string): boolean {
	return !!widgets && column in widgets;
}

/** `getInputType()`: the comparator type of the widget a column filters with. */
export function getInputType(ctx: FilterWidgetContext, field: string): FilterComparatorType | undefined {
	if (isWidget(ctx.widgets, field)) {
		const widgetType = ctx.widgets?.[field]?.widget_type ?? '';
		return getFilterComparatorType(FILTER_UI_WIDGETS[widgetType] || undefined);
	}
	const tableType = ctx.tableTypes[field];
	return getFilterComparatorType(tableType === undefined ? undefined : ctx.inputs[tableType]);
}

/** `getComparatorType(getInputType(field))`. */
export function getFieldComparatorFamily(ctx: FilterWidgetContext, field: string): ComparatorFamily {
	return getComparatorFamily(getInputType(ctx, field));
}

/** The column's own filter widget, ignoring any configured widget (`inputs[tableTypes[field]]`). */
export function columnFilterComponent(ctx: FilterWidgetContext, field: string): Component | undefined {
	const tableType = ctx.tableTypes[field];
	return tableType === undefined ? undefined : ctx.inputs[tableType];
}

/**
 * The widget for a column: its configured widget type when that has a component, else the column
 * type's filter (the dialogs' `resolveValueComponent()` / the `widget_type ? UIwidgets[…] : inputs[…]`
 * template expressions).
 */
export function resolveFilterComponent(ctx: FilterWidgetContext, field: string): Component | undefined {
	if (isWidget(ctx.widgets, field)) {
		const widgetType = ctx.widgets?.[field]?.widget_type;
		const widget = widgetType ? FILTER_UI_WIDGETS[widgetType] : undefined;
		if (widget && typeof widget !== 'string') return widget;
	}
	return columnFilterComponent(ctx, field);
}
