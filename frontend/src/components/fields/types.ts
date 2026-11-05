/**
 * The props/events contract shared by every field widget, ported from the Angular `base-*` classes
 * (`BaseEditFieldComponent`, `BaseRecordViewFieldComponent`, `BaseTableDisplayFieldComponent`,
 * `BaseFilterFieldComponent`).
 *
 * Two deliberate renames, both forced by Vue:
 * - `key` → `fieldKey`. `key` is reserved in Vue and never reaches a component as a prop.
 * - Outputs become kebab-case events: `onFieldChange` → `field-change`, `onComparatorChange` →
 *   `comparator-change`, `onCopyToClipboard` → `copy-to-clipboard`. A dynamic host binds them with
 *   `v-on="{ fieldChange: …, comparatorChange: … }"`.
 *
 * `value` is not in the base props: each widget declares its own `value` type (a string for text,
 * a boolean for a checkbox, …) so its template is type-checked against what it actually renders.
 */
import type { TableField, TableForeignKey, WidgetStructure } from '@/models/table';

/** Inputs of a record-edit widget (the row edit form), minus `value`. */
export interface RecordEditFieldProps {
	fieldKey?: string;
	/** Column name; shown through `normalizeFieldName` unless the widget is given a display name. */
	label?: string;
	required?: boolean;
	readonly?: boolean;
	disabled?: boolean;
	structure?: TableField;
	widgetStructure?: WidgetStructure;
	relations?: TableForeignKey;
}

/** Events of a record-edit widget. */
export type RecordEditFieldEmits = {
	/** The new value to store in the row. */
	fieldChange: [value: unknown];
};

/** Inputs of a filter widget (filters dialog, saved filters), minus `value`. */
export interface FilterFieldProps extends RecordEditFieldProps {
	/** Focus the control on mount (the saved-filters quick filter). */
	autofocus?: boolean;
}

/** Events of a filter widget. */
export type FilterFieldEmits = {
	fieldChange: [value: unknown];
	/** The widget picked a comparator itself (`eq`, `contains`, `startswith`, `empty`, …). */
	comparatorChange: [comparator: string];
};

/** Inputs of a record-view widget (the read-only row panel), minus `value`. */
export interface RecordViewFieldProps {
	fieldKey?: string;
	structure?: TableField;
	widgetStructure?: WidgetStructure;
	rowData?: Record<string, unknown>;
	primaryKeys?: Record<string, unknown>;
}

/** Inputs of a table-display widget (a table cell), minus `value`. */
export interface TableDisplayFieldProps {
	fieldKey?: string;
	structure?: TableField;
	widgetStructure?: WidgetStructure;
	rowData?: Record<string, unknown>;
	primaryKeys?: { column_name: string }[];
}

/** Events of the record-view and table-display widgets. */
export type ViewFieldEmits = {
	/** A value was copied; the payload is the message the host shows in a snackbar. */
	copyToClipboard: [message: string];
};
