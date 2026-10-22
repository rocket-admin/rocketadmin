// The logic of frontend/src/app/components/db-table-row-edit (the `/dashboard/:connectionId/:tableName/entry`
// page), pulled out of the template so it can be tested on its own:
//
// - no query params: add a row (GET /table/structure);
// - the row's primary key as query params: edit it (GET /table/row), with `action=dub` to duplicate it
//   and `mode=view` to show it read-only;
// - the tables that reference the row (`referenced_table_names_and_columns`), each with its first
//   page of related records;
// - the row's custom actions and delete, through the confirmation / action-link dialogs.
//
// Only the fields the user touched are sent on update: widgets such as the foreign key and binary
// ones re-emit their current value on mount, and those init-time emits must not rewrite columns the
// user never edited.
import JsonURL from '@jsonurl/jsonurl';
import JSON5 from 'json5';
import { isEqual } from 'lodash-es';
import { computed, type MaybeRefOrGetter, ref, shallowRef, toValue } from 'vue';
import type { LocationQuery, LocationQueryRaw, Router } from 'vue-router';
import type { QueryParams } from '@/api/client';
import { isApiError } from '@/api/client';
import ActionLinkDialog from '@/components/dashboard/ActionLinkDialog.vue';
import BulkActionConfirmDialog from '@/components/dashboard/BulkActionConfirmationDialog.vue';
import { useDialog } from '@/composables/useDialog';
import { defaultTimestampValues, timestampTypes } from '@/consts/record-edit-types';
import { formatFieldValue } from '@/lib/format-field-value';
import { normalizeFieldName, normalizeTableName } from '@/lib/normalize';
import { getTableTypes } from '@/lib/setup-table-row-structure';
import type { ServerError } from '@/models/alert';
import { DBtype } from '@/models/connection';
import type { CustomEvent, TableField, TableForeignKey, TableRow, Widget, WidgetStructure } from '@/models/table';
import { useCedarPermissionsStore } from '@/stores/cedar-permissions';
import { useConnectionsStore } from '@/stores/connections';
import { useNotificationsStore } from '@/stores/notifications';
import { type TableRowResponse, useTableRowStore } from '@/stores/table-row';
import { useTableStateStore } from '@/stores/table-state';
import { type TableRowsResponse, type TableStructureResponse, useTablesStore } from '@/stores/tables';

export type RowValues = Record<string, unknown>;

/** One table that references the edited row, from `referenced_table_names_and_columns[0].referenced_by`. */
export interface ReferencingTable {
	table_name: string;
	column_name: string;
	display_name?: string;
}

export interface ReferencedTablesInfo {
	referenced_on_column_name: string;
	referenced_by: (ReferencingTable | null)[];
}

export interface ReferencedTable extends ReferencingTable {
	displayTableName: string;
}

/** What the related-records panel lists for one referencing table. */
export interface ReferencedRecords {
	rawRows: RowValues[];
	formattedRows: RowValues[];
	identityColumn: { isSet: boolean; name: string; displayName: string };
	fieldsOrder: { fieldName: string; displayName: string }[];
	foreignKeys: TableForeignKey[];
}

/** The side row view's input for a related record, minus the record itself. */
export interface RelatedTableProperties {
	connectionID: string;
	tableName: string;
	columnsOrder: string[];
	primaryColumns: { column_name: string; data_type: string }[];
	foreignKeys: Record<string, TableForeignKey>;
	foreignKeysList: string[];
	widgets: Record<string, WidgetStructure>;
	widgetsList: string[];
	fieldsTypes: Record<string, string>;
	relatedRecords: unknown;
	link: string;
}

/** GET /table/row, with the fields this page reads. */
export interface RowEditRowResponse extends TableRowResponse {
	display_name?: string;
	can_delete?: boolean;
	columns_view?: string[];
	list_fields: string[];
	table_actions?: CustomEvent[];
	identity_column?: string;
	referenced_table_names_and_columns?: ReferencedTablesInfo[];
}

/** GET /table/structure, with the fields this page reads. */
export interface RowEditStructureResponse extends TableStructureResponse {
	display_name?: string;
	excluded_fields: string[];
	columns_view?: string[];
	list_fields: string[];
}

interface RelatedTableResponse extends TableRowsResponse {
	list_fields: string[];
	identity_column?: string;
}

export type PageAction = 'dub' | string;

export interface UseRowEditOptions {
	connectionId: MaybeRefOrGetter<string>;
	tableName: MaybeRefOrGetter<string>;
	router: Router;
}

const JSON_TYPES = ['json', 'jsonb', 'array', 'ARRAY', 'object', 'set', 'list', 'map'];

export const TEST_CONNECTION_WARNING = 'This is a TEST DATABASE, public to all. Avoid entering sensitive data!';

export function useRowEdit({ connectionId, tableName, router }: UseRowEditOptions) {
	const connections = useConnectionsStore();
	const tables = useTablesStore();
	const tableRow = useTableRowStore();
	const tableState = useTableStateStore();
	const notifications = useNotificationsStore();
	const permissions = useCedarPermissionsStore();
	const dialog = useDialog();

	const loading = ref(true);
	const isServerError = ref(false);
	const serverError = ref<ServerError | null>(null);
	const displayTableName = ref<string | null>(null);
	const tableRowValues = ref<RowValues | null>(null);
	const touchedFields = new Set<string>();
	const tableRowStructure = ref<Record<string, TableField>>({});
	const tableRowRequiredValues = ref<Record<string, boolean>>({});
	const identityColumn = ref<string | undefined>(undefined);
	const readonlyFields = ref<string[]>([]);
	const nonModifyingFields = ref<string[]>([]);
	const keyAttributesFromURL = ref<RowValues>({});
	const hasKeyAttributesFromURL = ref(false);
	const dubURLParams = ref<LocationQueryRaw>({});
	const keyAttributesListFromStructure = ref<string[]>([]);
	const isPrimaryKeyUpdated = ref(false);
	const tableTypes = ref<Record<string, string>>({});
	const tableWidgets = ref<Record<string, WidgetStructure>>({});
	const tableWidgetsList = ref<string[]>([]);
	const submitting = ref(false);
	const fieldsOrdered = ref<string[]>([]);
	const rowActions = ref<CustomEvent[]>([]);
	const referencedTables = ref<ReferencedTable[]>([]);
	const referencedRecords = ref<Record<string, ReferencedRecords>>({});
	const referencedTablesURLParams = ref<LocationQueryRaw[]>([]);
	const relatedRecordsProperties = ref<Record<string, RelatedTableProperties>>({});
	const canDelete = ref(false);
	const pageAction = ref<PageAction | null>(null);
	const pageMode = ref<string | null>(null);
	const tableForeignKeys = shallowRef<TableForeignKey[]>([]);
	const tableFiltersUrlString = ref('null');
	const backUrlParams = ref<LocationQueryRaw>({});

	const connectionType = computed(() => connections.currentConnection.type);
	const isTestConnection = computed(() => !!connections.currentConnection.isTestConnection);

	const tableResourceId = computed(() => `${toValue(connectionId)}/${toValue(tableName)}`);
	const canEditRow = tablePermission('table:edit');
	const canAddRow = tablePermission('table:add');
	const canDeleteRow = tablePermission('table:delete');

	const pageTitle = computed(() => {
		if (pageMode.value === 'view') return 'View row';
		if (hasKeyAttributesFromURL.value && pageAction.value === 'dub') return 'Duplicate row';
		if (hasKeyAttributesFromURL.value && !pageAction.value) return 'Edit row';
		return 'Add row';
	});

	/** Every widget is readonly when the user may not edit (unless duplicating) or in view mode. */
	const fieldsReadonly = computed(() => (!canEditRow.value && pageAction.value !== 'dub') || pageMode.value === 'view');

	const tablePath = computed(() => `/dashboard/${toValue(connectionId)}/${toValue(tableName)}`);
	const entryPath = computed(() => `${tablePath.value}/entry`);

	/** Loads the page for the route's query: add a row without one, edit/duplicate/view with a key. */
	async function load(query: LocationQuery): Promise<void> {
		resetState();
		tableFiltersUrlString.value = JsonURL.stringify(tableState.getBackUrlFilters()) ?? 'null';
		backUrlParams.value = {
			...tableState.getBackUrlParams(),
			...(tableFiltersUrlString.value !== 'null' ? { filters: tableFiltersUrlString.value } : {}),
		};

		const params = queryToParams(query);
		if (Object.keys(params).length === 0) {
			await loadNewRow();
		} else {
			await loadExistingRow(params);
		}
	}

	async function loadNewRow(): Promise<void> {
		const name = toValue(tableName);
		let res: RowEditStructureResponse;
		try {
			res = await tables.fetchTableStructure<RowEditStructureResponse>(toValue(connectionId), name);
		} catch {
			// Reported by the store.
			return;
		}
		displayTableName.value = res.display_name || normalizeTableName(name);
		document.title = `${displayTableName.value} - Add new record | Rocketadmin`;

		keyAttributesListFromStructure.value = res.primaryColumns.map((field) => field.column_name);
		readonlyFields.value = res.readonly_fields ?? [];
		tableForeignKeys.value = res.foreignKeys ?? [];
		setRowStructure(res.structure);
		if (res.table_widgets) setWidgets(res.table_widgets);
		const excluded = res.excluded_fields ?? [];
		const shownRows = getModifyingFields(res.structure).filter((field) => !excluded.includes(field.column_name));
		const allowNullFields = res.structure.filter((field) => field.allow_null).map((field) => field.column_name);
		tableRowValues.value = Object.fromEntries(
			shownRows.map((field) => [field.column_name, allowNullFields.includes(field.column_name) ? null : '']),
		);
		const shownFieldsList = shownRows.map((field) => field.column_name);
		if (res.columns_view?.length) {
			fieldsOrdered.value = res.columns_view.filter((field) => shownFieldsList.includes(field));
		} else if (res.list_fields?.length) {
			fieldsOrdered.value = res.list_fields.filter((field) => shownFieldsList.includes(field));
		} else {
			fieldsOrdered.value = Object.keys(tableRowValues.value);
		}
		loading.value = false;
	}

	async function loadExistingRow(params: QueryParams): Promise<void> {
		const { action, mode, ...primaryKeys } = params;
		if (action) pageAction.value = String(action);
		if (mode) pageMode.value = String(mode);

		keyAttributesFromURL.value = primaryKeys;
		dubURLParams.value = { ...toQuery(primaryKeys), action: 'dub' };
		hasKeyAttributesFromURL.value = Object.keys(primaryKeys).length > 0;

		const name = toValue(tableName);
		let res: RowEditRowResponse;
		try {
			res = await tableRow.fetchTableRow<RowEditRowResponse>(toValue(connectionId), name, params);
		} catch (error) {
			loading.value = false;
			isServerError.value = true;
			serverError.value = {
				abstract: error instanceof Error ? error.message : String(error),
				details: (isApiError(error) && error.details) || '',
			};
			return;
		}

		displayTableName.value = res.display_name || normalizeTableName(name);
		document.title = `${displayTableName.value} - Edit record | Rocketadmin`;
		canDelete.value = !!res.can_delete;
		keyAttributesListFromStructure.value = res.primaryColumns.map((field) => field.column_name);

		const modifying = getModifyingFields(res.structure).map((field) => field.column_name);
		nonModifyingFields.value = res.structure
			.map((field) => field.column_name)
			.filter((column) => !modifying.includes(column));
		readonlyFields.value = [...(res.readonly_fields ?? []), ...nonModifyingFields.value];
		if (connectionType.value === DBtype.Dynamo || connectionType.value === DBtype.ClickHouse) {
			readonlyFields.value = [...readonlyFields.value, ...res.primaryColumns.map((field) => field.column_name)];
		}
		tableForeignKeys.value = res.foreignKeys ?? [];
		tableRowValues.value = { ...res.row };
		if (res.columns_view?.length) {
			fieldsOrdered.value = [...res.columns_view];
		} else if (res.list_fields?.length) {
			fieldsOrdered.value = [...res.list_fields];
		} else {
			fieldsOrdered.value = Object.keys(tableRowValues.value);
		}

		if (pageAction.value === 'dub') {
			fieldsOrdered.value = fieldsOrdered.value.filter((field) => !nonModifyingFields.value.includes(field));
		}

		if (res.table_actions) rowActions.value = res.table_actions;
		if (res.table_widgets) setWidgets(res.table_widgets);
		setRowStructure(res.structure);
		identityColumn.value = res.identity_column;

		const references = res.referenced_table_names_and_columns?.[0];
		if (references && references.referenced_by[0] !== null) {
			setReferencedTables(references);
		}

		loading.value = false;
	}

	function setReferencedTables(references: ReferencedTablesInfo): void {
		const referencingTables = references.referenced_by.filter((table): table is ReferencingTable => table !== null);
		const rowValue = tableRowValues.value?.[references.referenced_on_column_name];

		referencedTables.value = referencingTables.map((table) => ({
			...table,
			displayTableName: table.display_name || normalizeTableName(table.table_name),
		}));
		referencedTablesURLParams.value = referencingTables.map((table) => ({
			filters: JsonURL.stringify({ [table.column_name]: { eq: rowValue } }) ?? '',
			page_index: 0,
		}));

		for (const table of referencingTables) {
			loadReferencedRecords(table, { [table.column_name]: { eq: rowValue } });
		}
	}

	async function loadReferencedRecords(table: ReferencingTable, filters: object): Promise<void> {
		const id = toValue(connectionId);
		let res: RelatedTableResponse | null;
		try {
			res = await tables.fetchTable<RelatedTableResponse>({
				connectionID: id,
				tableName: table.table_name,
				requstedPage: 1,
				chunkSize: 30,
				filters,
			});
		} catch {
			return;
		}
		if (!res) return;

		const foreignKeysList = res.foreignKeys.map((foreignKey) => foreignKey.column_name);
		const foreignKeysByColumn: Record<string, TableForeignKey> = Object.fromEntries(
			res.foreignKeys.map((foreignKey) => [foreignKey.column_name, foreignKey]),
		);
		const widgets: Record<string, WidgetStructure> = Object.fromEntries(
			res.widgets.map((widget) => {
				let parsedParams: Record<string, unknown>;
				try {
					parsedParams = JSON5.parse(widget.widget_params);
				} catch {
					parsedParams = {};
				}
				return [widget.field_name, { ...widget, widget_params: parsedParams }];
			}),
		);

		relatedRecordsProperties.value = {
			...relatedRecordsProperties.value,
			[table.table_name]: {
				connectionID: id,
				tableName: table.table_name,
				columnsOrder: res.list_fields,
				primaryColumns: res.primaryColumns,
				foreignKeys: foreignKeysByColumn,
				foreignKeysList,
				widgets,
				widgetsList: res.widgets.map((widget) => widget.field_name),
				fieldsTypes: getTableTypes(res.structure, foreignKeysList),
				relatedRecords: [],
				link: `/dashboard/${id}/${table.table_name}/entry`,
			},
		};

		const firstRow = res.rows?.[0];
		if (firstRow) {
			const keys: QueryParams = {};
			for (const column of res.primaryColumns) {
				const referencedColumn = foreignKeysByColumn[column.column_name]?.referenced_column_name ?? '';
				const value = foreignKeysList.includes(column.column_name)
					? (firstRow[column.column_name] as RowValues | undefined)?.[referencedColumn]
					: firstRow[column.column_name];
				keys[column.column_name] = toParam(value);
			}
			tableRow
				.fetchTableRow<RowEditRowResponse>(id, table.table_name, keys)
				.then((related) => {
					const properties = relatedRecordsProperties.value[table.table_name];
					if (properties) properties.relatedRecords = related.referenced_table_names_and_columns?.[0];
				})
				.catch(() => {});
		}

		const foreignKeyMap: Record<string, string> = Object.fromEntries(
			res.foreignKeys.map((foreignKey) => [foreignKey.column_name, foreignKey.referenced_column_name]),
		);
		const structure = res.structure;
		const formattedRows = res.rows.map((row) => {
			const formattedRow: RowValues = {};
			for (const key in row) {
				const value = row[key];
				if (foreignKeyMap[key] && typeof value === 'object' && value !== null) {
					const record = value as RowValues;
					const preferredKey = Object.keys(record).find((k) => k !== foreignKeyMap[key]);
					formattedRow[key] = preferredKey ? record[preferredKey] : record[foreignKeyMap[key]];
				} else {
					formattedRow[key] = formatFieldValue(
						value,
						structure.find((field) => field.column_name === key)?.data_type || 'text',
					);
				}
			}
			return formattedRow;
		});

		const displayName = (field: string) => widgets[field]?.name || normalizeFieldName(field);
		const toFieldOrder = (field: string) => ({ fieldName: field, displayName: displayName(field) });
		const identity = res.identity_column;
		let identityInfo: ReferencedRecords['identityColumn'];
		let fieldsOrder: ReferencedRecords['fieldsOrder'];

		if (identity) {
			identityInfo = { isSet: true, name: identity, displayName: displayName(identity) };
			const candidates = res.list_fields.length ? res.list_fields : structure.map((field) => field.column_name);
			fieldsOrder = candidates
				.filter((field) => field !== identity)
				.slice(0, 3)
				.map(toFieldOrder);
		} else if (res.list_fields.length) {
			const first = res.list_fields[0] ?? '';
			identityInfo = { isSet: false, name: first, displayName: displayName(first) };
			fieldsOrder = res.list_fields.slice(1, 4).map(toFieldOrder);
		} else {
			const first = structure[0]?.column_name ?? '';
			identityInfo = { isSet: false, name: first, displayName: displayName(first) };
			fieldsOrder = structure
				.slice(1, 4)
				.map((field) => field.column_name)
				.map(toFieldOrder);
		}

		referencedRecords.value = {
			...referencedRecords.value,
			[table.table_name]: {
				rawRows: res.rows,
				formattedRows,
				identityColumn: identityInfo,
				fieldsOrder,
				foreignKeys: res.foreignKeys,
			},
		};
	}

	function setRowStructure(structure: TableField[]): void {
		tableRowStructure.value = Object.fromEntries(structure.map((field) => [field.column_name, field]));
		const foreignKeysList = tableForeignKeys.value.map((field) => field.column_name);
		tableTypes.value = getTableTypes(structure, foreignKeysList);
		tableRowRequiredValues.value = Object.fromEntries(
			structure.map((field) => [field.column_name, field.allow_null === false && field.column_default === null]),
		);
	}

	function setWidgets(widgets: Widget[]): void {
		tableWidgetsList.value = widgets.map((widget) => widget.field_name);
		tableWidgets.value = Object.fromEntries(
			widgets.map((widget) => {
				let params = null;
				if (widget.widget_params) {
					try {
						params = JSON5.parse(widget.widget_params);
					} catch {
						params = null;
					}
				}
				return [widget.field_name, { ...widget, widget_params: params }];
			}),
		);
	}

	function setForeignKeys(foreignKeys: TableForeignKey[]): void {
		tableForeignKeys.value = foreignKeys;
	}

	function getRelations(columnName: string): TableForeignKey | undefined {
		return tableForeignKeys.value.find((relation) => relation.column_name === columnName);
	}

	function isReadonlyField(columnName: string): boolean {
		return readonlyFields.value.includes(columnName);
	}

	function isWidget(columnName: string): boolean {
		return tableWidgetsList.value.includes(columnName);
	}

	/** Columns the user can set: not auto-increment, not a defaulted key, not a defaulted timestamp. */
	function getModifyingFields(fields: TableField[]): TableField[] {
		const defaults: string[] | undefined = (defaultTimestampValues as Record<string, string[]>)[connectionType.value];
		return fields.filter(
			(field) =>
				!field.auto_increment &&
				!(keyAttributesListFromStructure.value.includes(field.column_name) && field.column_default) &&
				!(
					timestampTypes.includes(field.data_type) &&
					field.column_default &&
					defaults?.includes(field.column_default.toLowerCase().replace(/\(.*\)/, ''))
				),
		);
	}

	function updateField(updatedValue: unknown, field: string): void {
		const values = tableRowValues.value;
		if (!values) return;
		const existing = values[field];
		if (!isEqual(updatedValue, existing)) touchedFields.add(field);
		if (
			typeof updatedValue === 'object' &&
			updatedValue !== null &&
			typeof existing === 'object' &&
			existing !== null
		) {
			// Mutate in place, as Angular did: widgets holding the object keep seeing the same one.
			const target = existing as RowValues;
			for (const prop of Object.getOwnPropertyNames(target)) delete target[prop];
			Object.assign(target, updatedValue);
		} else {
			values[field] = updatedValue;
		}

		if (Object.keys(keyAttributesFromURL.value).includes(field)) isPrimaryKeyUpdated.value = true;
	}

	/** The row to send: all fields, or only the touched ones, with the per-DB value fixes applied. */
	function getFormattedUpdatedRow(onlyTouched = false): RowValues {
		const values = tableRowValues.value ?? {};
		const updatedRow: RowValues = onlyTouched
			? Object.fromEntries(Object.entries(values).filter(([key]) => touchedFields.has(key)))
			: { ...values };
		const types = Object.entries(tableTypes.value);

		// MySQL returns datetimes as ISO strings ('…T…000Z') but won't store them in that form.
		if (connectionType.value === DBtype.MySQL) {
			for (const [field] of types.filter(([, type]) => type === 'datetime' || type === 'timestamp')) {
				const value = updatedRow[field];
				if (value && typeof value === 'string') {
					updatedRow[field] = value.replace('T', ' ').replace('Z', '').split('.')[0];
				}
			}
			for (const [field] of types.filter(([, type]) => type === 'date')) {
				const value = updatedRow[field];
				if (value && typeof value === 'string') updatedRow[field] = value.split('T')[0];
			}
		}

		// Don't override the primary key fields for DynamoDB / ClickHouse.
		if (connectionType.value === DBtype.Dynamo || connectionType.value === DBtype.ClickHouse) {
			for (const field of Object.keys(keyAttributesFromURL.value)) delete updatedRow[field];
		}

		for (const [field] of types.filter(([, type]) => JSON_TYPES.includes(type))) {
			if (updatedRow[field] === '') updatedRow[field] = null;
			const value = updatedRow[field];
			if (typeof value === 'string') updatedRow[field] = JSON.parse(value);
		}

		if (pageAction.value === 'dub') {
			for (const field of nonModifyingFields.value) delete updatedRow[field];
		}

		return updatedRow;
	}

	function handleRowSubmitting(continueEditing: boolean): Promise<void> {
		if (hasKeyAttributesFromURL.value && pageAction.value !== 'dub') return updateRow(continueEditing);
		return addRow(continueEditing);
	}

	async function addRow(continueEditing: boolean): Promise<void> {
		const formattedUpdatedRow = getFormattedUpdatedRow();
		submitting.value = true;
		try {
			const res = await tableRow.addTableRow(toValue(connectionId), toValue(tableName), formattedUpdatedRow);
			const keys: RowValues = {};
			for (const column of res.primaryColumns) keys[column.column_name] = res.row[column.column_name];
			keyAttributesFromURL.value = keys;
			if (continueEditing) {
				router.push({ path: entryPath.value, query: toQuery(keys) });
			} else {
				router.push({ path: tablePath.value, query: { filters: tableFiltersUrlString.value, page_index: 0 } });
			}
			pageAction.value = null;
			notifications.dismissAlert();
		} catch {
			// Reported by the store.
		} finally {
			submitting.value = false;
		}
	}

	async function updateRow(continueEditing: boolean): Promise<void> {
		const formattedUpdatedRow = getFormattedUpdatedRow(true);
		submitting.value = true;
		try {
			const res = await tableRow.updateTableRow(
				toValue(connectionId),
				toValue(tableName),
				toParams(keyAttributesFromURL.value),
				formattedUpdatedRow,
			);
			touchedFields.clear();
			notifications.dismissAlert();
			if (continueEditing) {
				if (isPrimaryKeyUpdated.value) {
					const keys: RowValues = {};
					for (const key of Object.keys(keyAttributesFromURL.value)) keys[key] = res.row[key];
					router.push({ path: entryPath.value, query: toQuery(keys) });
				}
			} else {
				router.push({ path: tablePath.value, query: backUrlParams.value });
			}
		} catch {
			// Reported by the store.
		} finally {
			submitting.value = false;
		}
	}

	function handleDeleteRow(): Promise<void> {
		return handleActivateAction({ title: 'Delete row', require_confirmation: true });
	}

	async function handleActivateAction(
		action: Pick<CustomEvent, 'title' | 'require_confirmation'> & Partial<CustomEvent>,
	): Promise<void> {
		const primaryKeys = [keyAttributesFromURL.value];
		if (action.require_confirmation) {
			const confirmRef = dialog.open<boolean>(BulkActionConfirmDialog, {
				data: { id: action.id, title: action.title, primaryKeys, tableDisplayName: displayTableName.value },
			});
			if (!action.id) {
				// Deleting the row: back to the table once it is gone.
				const deleted = await confirmRef.afterClosed();
				if (deleted) router.push({ path: tablePath.value, query: backUrlParams.value });
			}
			return;
		}
		if (!action.id) return;
		try {
			const res = (await tables.activateActions(
				toValue(connectionId),
				toValue(tableName),
				action.id,
				action.title,
				primaryKeys,
			)) as { location?: string } | null;
			if (res?.location) {
				dialog.open(ActionLinkDialog, {
					data: { href: res.location, actionName: action.title, primaryKeys: keyAttributesFromURL.value },
				});
			}
		} catch {
			// Reported by the store.
		}
	}

	/** Opens a related record in the side row view. */
	function handleViewRow(name: string, row: RowValues): void {
		const properties = relatedRecordsProperties.value[name];
		if (!properties) return;
		const primaryKeys: RowValues = {};
		for (const column of properties.primaryColumns) primaryKeys[column.column_name] = row[column.column_name];
		// The row view reads `widgets` / `foreignKeys` as maps by column, as the Angular one did; the
		// TableRow model still types them as arrays.
		tableState.selectRow({ ...properties, record: row, primaryKeys } as unknown as TableRow);
	}

	function switchToEditMode(): void {
		pageMode.value = null;
		router.push({ path: entryPath.value, query: toQuery(keyAttributesFromURL.value) });
	}

	function resetState(): void {
		loading.value = true;
		isServerError.value = false;
		serverError.value = null;
		tableRowValues.value = null;
		touchedFields.clear();
		keyAttributesFromURL.value = {};
		hasKeyAttributesFromURL.value = false;
		isPrimaryKeyUpdated.value = false;
		pageAction.value = null;
		pageMode.value = null;
		rowActions.value = [];
		referencedTables.value = [];
		referencedRecords.value = {};
		referencedTablesURLParams.value = [];
		relatedRecordsProperties.value = {};
		tableWidgets.value = {};
		tableWidgetsList.value = [];
		canDelete.value = false;
	}

	function tablePermission(action: string) {
		return computed(() => permissions.canI(action, 'Table', tableResourceId.value).value);
	}

	return {
		loading,
		isServerError,
		serverError,
		displayTableName,
		tableRowValues,
		tableRowStructure,
		tableRowRequiredValues,
		identityColumn,
		readonlyFields,
		nonModifyingFields,
		keyAttributesFromURL,
		hasKeyAttributesFromURL,
		dubURLParams,
		keyAttributesListFromStructure,
		isPrimaryKeyUpdated,
		tableTypes,
		tableWidgets,
		tableWidgetsList,
		submitting,
		fieldsOrdered,
		rowActions,
		referencedTables,
		referencedRecords,
		referencedTablesURLParams,
		relatedRecordsProperties,
		canDelete,
		pageAction,
		pageMode,
		tableForeignKeys,
		tableFiltersUrlString,
		backUrlParams,
		connectionType,
		isTestConnection,
		canEditRow,
		canAddRow,
		canDeleteRow,
		pageTitle,
		fieldsReadonly,
		tablePath,
		entryPath,
		load,
		setRowStructure,
		setWidgets,
		setForeignKeys,
		getRelations,
		isReadonlyField,
		isWidget,
		getModifyingFields,
		updateField,
		getFormattedUpdatedRow,
		handleRowSubmitting,
		handleDeleteRow,
		handleActivateAction,
		handleViewRow,
		switchToEditMode,
	};
}

/** The route query as request params; a repeated key keeps its first value. */
function queryToParams(query: LocationQuery): QueryParams {
	const params: QueryParams = {};
	for (const [key, value] of Object.entries(query)) {
		params[key] = Array.isArray(value) ? (value[0] ?? null) : value;
	}
	return params;
}

function toParam(value: unknown): string | number | boolean | null {
	if (value === null || value === undefined) return null;
	if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
	return String(value);
}

function toParams(values: RowValues): QueryParams {
	return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, toParam(value)]));
}

function toQuery(values: RowValues): LocationQueryRaw {
	return Object.fromEntries(
		Object.entries(values).map(([key, value]) => {
			const param = toParam(value);
			return [key, typeof param === 'boolean' ? String(param) : param];
		}),
	);
}
