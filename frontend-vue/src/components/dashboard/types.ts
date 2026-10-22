// Contracts between the table browser's pieces: what TableView emits to DashboardView, the dialog
// data, and what the components ported in parallel (filters dialog, saved filters panel) hand back.
import type { TableField, TableForeignKey, WidgetStructure } from '@/models/table';

/** A custom action (rule event) as the table view triggers it, or the built-in "Delete row(s)". */
export interface ActionToActivate {
	id?: string;
	title: string;
	type: string;
	require_confirmation: boolean;
	icon?: string;
}

/** `activateActions` of the table view (DataToActivateActions in Angular). */
export interface ActivateActionsPayload {
	action: ActionToActivate;
	primaryKeys: Record<string, unknown>[];
	identityFieldValues?: unknown[] | null;
}

/** The table's shape, as `openFilters` hands it up and the filters dialog takes it (`data.structure`). */
export interface FiltersStructure {
	structure: TableField[] | null;
	foreignKeysList: string[];
	foreignKeys: Record<string, TableForeignKey>;
	widgets: Record<string, WidgetStructure>;
}

/**
 * `openFilters`. From an active-filter chip, the table view has already run the dialog and adds
 * its result (`filters` = tableRowFieldsShown, `comparators` = tableRowFieldsComparator).
 */
export interface OpenFiltersPayload extends FiltersStructure {
	filters?: Record<string, unknown>;
	comparators?: Record<string, string | undefined>;
}

/**
 * TableFiltersDialog's afterClosed result, read defensively. Angular closed with 'filter'/'reset'
 * and the caller read `componentInstance.tableRowFieldsShown` / `.tableRowFieldsComparator`; the
 * Vue dialog closes with `{ action, filters, comparators }` instead (the Angular field names are
 * accepted too). Null when dismissed.
 */
export function readFiltersDialogResult(
	result: unknown,
):
	| { action: 'reset' }
	| { action: 'filter'; fields: Record<string, unknown>; comparators: Record<string, string | undefined> }
	| null {
	if (result === 'reset') return { action: 'reset' };
	if (!result || typeof result !== 'object') return null;
	const value = result as Record<string, unknown>;
	if (value.action === 'reset') return { action: 'reset' };
	if (value.action !== 'filter') return null;
	return {
		action: 'filter',
		fields: (value.tableRowFieldsShown ?? value.filters ?? {}) as Record<string, unknown>,
		comparators: (value.tableRowFieldsComparator ?? value.comparators ?? {}) as Record<string, string | undefined>,
	};
}

/** One saved filter as SavedFiltersPanel lists it. */
export interface SavedFilterItem {
	id: string;
	name: string;
	[key: string]: unknown;
}

/**
 * What SavedFiltersPanel exposes (`defineExpose`) — the members db-table-view reached through
 * `@ViewChild(SavedFiltersPanelComponent)` for the mobile fast-filter chips and "Create fast filter".
 */
export interface SavedFiltersPanelApi {
	handleOpenSavedFiltersDialog(filtersSet?: SavedFilterItem | null): void;
	/** The rest drives the mobile fast-filter chips; without them the chips stay hidden. */
	savedFilterData?: SavedFilterItem[] | null;
	selectedFilterSetId?: string | null;
	selectFiltersSet?(id: string): void;
	handleEditFilter?(filter: SavedFilterItem): void;
	handleDeleteFilter?(filter: SavedFilterItem): void;
}

/** `filterSelected` of SavedFiltersPanel: the selected saved filter (its `filters` applied), or null. */
export interface SavedFilterSelection {
	filters?: Record<string, Record<string, unknown>>;
	[key: string]: unknown;
}

/** MAT_DIALOG_DATA of db-bulk-action-confirmation-dialog. */
export interface BulkActionConfirmationData {
	/** The custom action's id; omitted for a delete. */
	id?: string;
	title: string;
	primaryKeys: Record<string, unknown>[];
	/** The rows' identity values, listed instead of their primary keys when given. */
	identityFieldValues?: unknown[] | null;
	tableDisplayName?: string | null;
}

/** MAT_DIALOG_DATA of db-action-link-dialog. */
export interface ActionLinkDialogData {
	href: string;
	actionName: string;
	primaryKeys?: Record<string, unknown>;
	/** Shown instead of the primary key when given. */
	identityFieldValue?: unknown;
}
