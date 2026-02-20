import { ClipboardModule } from '@angular/cdk/clipboard';
import { SelectionModel } from '@angular/cdk/collections';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import {
	ChangeDetectorRef,
	Component,
	EventEmitter,
	Input,
	OnChanges,
	OnInit,
	Output,
	SimpleChanges,
	ViewChild,
} from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import JsonURL from '@jsonurl/jsonurl';
import { Angulartics2OnModule } from 'angulartics2';
import JSON5 from 'json5';
import { DynamicModule } from 'ng-dynamic-component';
import { SignalComponentIoModule } from 'ng-dynamic-component/signal-component-io';
import posthog from 'posthog-js';
import { merge } from 'rxjs';
import { tap } from 'rxjs/operators';
import { formatFieldValue } from 'src/app/lib/format-field-value';
import { getTableTypes } from 'src/app/lib/setup-table-row-structure';
import {
	CustomAction,
	TableForeignKey,
	TableOrdering,
	TablePermissions,
	TableProperties,
	TableRow,
	Widget,
} from 'src/app/models/table';
import { AccessLevel } from 'src/app/models/user';
import { ConnectionsService } from 'src/app/services/connections.service';
import { NotificationsService } from 'src/app/services/notifications.service';
import { TableRowService } from 'src/app/services/table-row.service';
import { TableStateService } from 'src/app/services/table-state.service';
import { TablesService } from 'src/app/services/tables.service';
import { tableDisplayTypes, UIwidgets } from '../../../consts/table-display-types';
import { normalizeTableName } from '../../../lib/normalize';
import { PlaceholderTableDataComponent } from '../../skeletons/placeholder-table-data/placeholder-table-data.component';
import { ForeignKeyDisplayComponent } from '../../ui-components/table-display-fields/foreign-key/foreign-key.component';
import { DbTableExportDialogComponent } from './db-table-export-dialog/db-table-export-dialog.component';
import { DbTableFiltersDialogComponent } from './db-table-filters-dialog/db-table-filters-dialog.component';
import { DbTableImportDialogComponent } from './db-table-import-dialog/db-table-import-dialog.component';
import { SavedFiltersPanelComponent } from './saved-filters-panel/saved-filters-panel.component';

interface Column {
	title: string;
	selected: boolean;
}

interface TableCategory {
	category_id: string;
	category_name: string;
	category_color?: string;
	tables: TableProperties[];
}

@Component({
	selector: 'app-db-table-view',
	standalone: true,
	templateUrl: './db-table-view.component.html',
	styleUrls: ['./db-table-view.component.css'],
	imports: [
		CommonModule,
		FormsModule,
		RouterModule,
		MatTableModule,
		MatPaginatorModule,
		MatSortModule,
		MatButtonModule,
		MatIconModule,
		MatCheckboxModule,
		MatChipsModule,
		MatDialogModule,
		MatDividerModule,
		MatFormFieldModule,
		MatSelectModule,
		ReactiveFormsModule,
		MatInputModule,
		MatAutocompleteModule,
		MatMenuModule,
		MatTooltipModule,
		ClipboardModule,
		DragDropModule,
		Angulartics2OnModule,
		PlaceholderTableDataComponent,
		DynamicModule,
		SignalComponentIoModule,
		ForeignKeyDisplayComponent,
		SavedFiltersPanelComponent,
	],
})
export class DbTableViewComponent implements OnInit, OnChanges {
	protected posthog = posthog;
	@Input() name: string;
	@Input() displayName: string;
	@Input() permissions: TablePermissions;
	@Input() accessLevel: AccessLevel;
	@Input() connectionID: string;
	@Input() isTestConnection: boolean;
	@Input() activeFilters: object;
	@Input() filterComparators: object;
	@Input() selection: SelectionModel<any>;
	@Input() tableFolders: TableCategory[] = [];

	@Output() openFilters = new EventEmitter();
	@Output() openPage = new EventEmitter();
	@Output() search = new EventEmitter();
	@Output() removeFilter = new EventEmitter();
	@Output() resetAllFilters = new EventEmitter();
	// @Output() viewRow = new EventEmitter();

	public hasSavedFilterActive: boolean = false;
	@Output() activateAction = new EventEmitter();
	@Output() activateActions = new EventEmitter();

	@Output() applyFilter = new EventEmitter();

	// public tablesSwitchControl = new FormControl('');
	public tableData: any;
	// public selection: any;
	public columns: Column[];
	public displayedColumns: string[] = [];
	public columnsToDisplay: string[] = [];
	public searchString: string;
	public staticSearchString: string;
	public actionsColumnWidth: string;
	public bulkActions: CustomAction[];
	public bulkRows: string[];
	public displayedComparators = {
		eq: '=',
		gt: '>',
		lt: '<',
		gte: '>=',
		lte: '<=',
	};
	public selectedRow: TableRow = null;
	public selectedRowType: 'record' | 'foreignKey' = 'record';
	public tableRelatedRecords: any = null;
	public displayCellComponents;
	public UIwidgets = UIwidgets;
	// public tableTypes: object;

	@Input() set table(value) {
		if (value) this.tableData = value;
	}

	@ViewChild(MatPaginator) paginator: MatPaginator;
	@ViewChild(MatSort) sort: MatSort;

	public defaultSort: { column: string; direction: 'asc' | 'desc' } | null = null;
	private sortInitialized: boolean = false;

	constructor(
		private _tableState: TableStateService,
		private _notifications: NotificationsService,
		private _tableRow: TableRowService,
		private _connections: ConnectionsService,
		private _tables: TablesService,
		private route: ActivatedRoute,
		public router: Router,
		public dialog: MatDialog,
		private cdr: ChangeDetectorRef,
	) {}

	ngAfterViewInit() {
		this.tableData.paginator = this.paginator;

		// Check if sort params exist in URL
		const urlSortActive = this.route.snapshot.queryParams.sort_active;
		const urlSortDirection = this.route.snapshot.queryParams.sort_direction;

		// Subscribe to loading state to initialize default sort after data is loaded
		this.tableData.loading$.subscribe((loading: boolean) => {
			console.log(
				'loading$ changed:',
				loading,
				'sort.active:',
				this.sort?.active,
				'sort.direction:',
				this.sort?.direction,
			);

			if (!loading && this.tableData.defaultSort !== undefined) {
				console.log('DbTableViewComponent tableData loaded:', this.tableData);
				console.log('DbTableViewComponent tableData.defaultSort loaded:', this.tableData.defaultSort);

				// Only initialize sort and defaultSort on first load (or after table switch when sortInitialized was reset)
				if (!this.sortInitialized) {
					this.sortInitialized = true;

					// Only sync defaultSort from server on initial load, not on subsequent sort/pagination changes
					this.defaultSort = this.tableData.defaultSort;

					// Initialize sort based on priority: URL params > default sort
					if (urlSortActive && urlSortDirection) {
						// Use sort from URL
						this.sort.active = urlSortActive;
						this.sort.direction = urlSortDirection.toLowerCase() as 'asc' | 'desc';
					} else if (this.defaultSort) {
						// Use default sort if no URL params
						this.sort.active = this.defaultSort.column;
						this.sort.direction = this.defaultSort.direction;
					}
				}

				console.log(
					'After loading complete - sort.active:',
					this.sort?.active,
					'sort.direction:',
					this.sort?.direction,
				);
			}
		});

		merge(this.sort.sortChange, this.paginator.page)
			.pipe(
				tap(() => {
					const filters = JsonURL.stringify(this.activeFilters);
					const saved_filter = this.route.snapshot.queryParams.saved_filter;
					const dynamic_column = this.route.snapshot.queryParams.dynamic_column;

					this.router.navigate([`/dashboard/${this.connectionID}/${this.name}`], {
						queryParams: {
							filters,
							saved_filter,
							dynamic_column,
							sort_active: this.sort.active,
							sort_direction: this.sort.direction.toUpperCase(),
							page_index: this.paginator.pageIndex,
							page_size: this.paginator.pageSize,
						},
					});
					this.loadRowsPage();
				}),
			)
			.subscribe();
	}

	ngOnChanges(changes: SimpleChanges) {
		// When table name changes, reset sort to default
		if (changes.name && !changes.name.firstChange && this.sort) {
			console.log('Table name changed from', changes.name.previousValue, 'to', changes.name.currentValue);

			// Reset sort to empty state - it will be initialized with default sort when data loads
			this.sort.active = '';
			this.sort.direction = '' as any;

			// Reset defaultSort so the previous table's default doesn't show on the new table
			this.defaultSort = null;

			// Reset the sortInitialized flag so the sort gets re-initialized with new table's default sort
			this.sortInitialized = false;
		}
	}

	ngOnInit() {
		this.searchString = this.route.snapshot.queryParams.search;
		// this.hasSavedFilterActive = !!this.route.snapshot.queryParams.saved_filter;

		const connectionType = this._connections.currentConnection.type;
		this.displayCellComponents = tableDisplayTypes[connectionType];

		this._tableState.cast.subscribe((row) => {
			this.selectedRow = row;
		});

		this.route.queryParams.subscribe((params) => {
			this.hasSavedFilterActive = !!params.saved_filter;
			if (this.hasSavedFilterActive) this.searchString = '';
		});
	}

	get allTables(): TableProperties[] {
		return this.tableFolders?.find((cat) => cat.category_id === null)?.tables || [];
	}

	get tableFoldersForSelect(): TableCategory[] {
		if (!this.tableFolders) return [];
		return this.tableFolders.filter((cat) => cat.category_id !== null);
	}

	get uncategorizedTables(): TableProperties[] {
		const tablesInFolders = new Set<string>();
		this.tableFoldersForSelect.forEach((folder) => {
			(folder.tables || []).forEach((t) => tablesInFolders.add(t.table));
		});
		return this.allTables.filter((t) => !tablesInFolders.has(t.table));
	}


	loadRowsPage() {
		this.tableRelatedRecords = null;
		this.tableData.fetchRows({
			connectionID: this.connectionID,
			tableName: this.name,
			requstedPage: this.paginator.pageIndex,
			pageSize: this.paginator.pageSize,
			sortColumn: this.sort.active,
			sortOrder: this.sort.direction.toUpperCase(),
			filters: this.activeFilters,
			search: this.searchString,
			isTablePageSwitched: true,
		});
	}

	isSortable(column: string) {
		return this.tableData.sortByColumns.includes(column) || !this.tableData.sortByColumns.length;
	}

	applySort(column: string, direction: 'asc' | 'desc') {
		// If clicking on already selected sort - clear it
		if (this.sort.active === column && this.sort.direction === direction) {
			// If this column was the default, remove the default too
			if (this.defaultSort?.column === column) {
				this.defaultSort = null;
			}
			// Clear sort
			this.sort.active = '';
			this.sort.direction = '';
			this.sort.sortChange.emit({ active: '', direction: '' });
		} else {
			this.sort.active = column;
			this.sort.direction = direction;
			this.sort.sortChange.emit({ active: column, direction: direction });
		}
	}

	toggleDefaultSort(column: string) {
		if (this.isDefaultSort(column)) {
			// Remove default sort
			this.defaultSort = null;
			this._tables
				.updatePersonalTableViewSettings(this.connectionID, this.name, {
					ordering: null,
					ordering_field: null,
				})
				.subscribe({
					next: () => {
						console.log('Personal table view settings updated - default sort removed');
					},
					error: (error) => {
						console.error('Error updating personal table view settings:', error);
					},
				});
		} else {
			// Set current sort as default
			const direction = this.sort.active === column ? this.sort.direction : 'asc';
			this.defaultSort = { column, direction: direction as 'asc' | 'desc' };
			this._tables
				.updatePersonalTableViewSettings(this.connectionID, this.name, {
					ordering: this.sort.direction === 'asc' ? TableOrdering.Ascending : TableOrdering.Descending,
					ordering_field: column,
				})
				.subscribe({
					next: () => {
						console.log('Personal table view settings updated - default sort removed');
					},
					error: (error) => {
						console.error('Error updating personal table view settings:', error);
					},
				});
		}
	}

	isDefaultSort(column: string): boolean {
		return this.defaultSort?.column === column;
	}

	isForeignKey(column: string) {
		return this.tableData.foreignKeysList.includes(column);
	}

	getForeignKeyQueryParams(foreignKey: TableForeignKey, cell) {
		return {
			[foreignKey.referenced_column_name]: cell[foreignKey.referenced_column_name],
		};
	}

	isWidget(column: string) {
		if (this.tableData.widgetsList) return this.tableData.widgetsList.includes(column);
	}

	getCellValue(foreignKey: TableForeignKey, cell) {
		const identityColumnName = Object.keys(cell).find((key) => key !== foreignKey.referenced_column_name);
		if (identityColumnName) {
			return cell[identityColumnName];
		} else {
			return cell[foreignKey.referenced_column_name];
		}
	}

	getFiltersCount(activeFilters: object) {
		if (activeFilters && !this.hasSavedFilterActive) return Object.keys(activeFilters).length;
		return 0;
	}

	handleOpenFilters() {
		this.openFilters.emit({
			structure: this.tableData.structure,
			foreignKeysList: this.tableData.foreignKeysList,
			foreignKeys: this.tableData.foreignKeys,
			widgets: this.tableData.widgets,
		});
		this.searchString = '';
	}

	handleSearch() {
		this.searchString = this.searchString.trim();
		this.staticSearchString = this.searchString;
		this.search.emit(this.searchString);
	}

	handleOpenExportDialog() {
		this.dialog.open(DbTableExportDialogComponent, {
			width: '25em',
			data: {
				connectionID: this.connectionID,
				tableName: this.name,
				sortColumn: this.sort.active,
				sortOrder: this.sort.direction.toUpperCase(),
				filters: this.activeFilters,
				search: this.searchString,
			},
		});
	}

	handleOpenImportDialog() {
		this.dialog.open(DbTableImportDialogComponent, {
			width: '25em',
			data: {
				connectionID: this.connectionID,
				tableName: this.name,
				isTestConnection: this.isTestConnection,
			},
		});
	}

	clearSearch() {
		this.searchString = null;
		this.search.emit(this.searchString);
	}

	getFilter(activeFilter: { key: string; value: object }) {
		const displayedName = normalizeTableName(activeFilter.key);
		const comparator = Object.keys(activeFilter.value)[0];
		const filterValue = Object.values(activeFilter.value)[0];
		if (comparator === 'startswith') {
			return `${displayedName} = ${filterValue}...`;
		} else if (comparator === 'endswith') {
			return `${displayedName} = ...${filterValue}`;
		} else if (comparator === 'contains') {
			return `${displayedName} = ...${filterValue}...`;
		} else if (comparator === 'icontains') {
			return `${displayedName} != ...${filterValue}...`;
		} else if (comparator === 'empty') {
			return `${displayedName} = ' '`;
		} else {
			return `${displayedName} ${this.displayedComparators[Object.keys(activeFilter.value)[0]]} ${filterValue}`;
		}
	}

	/** Whether the number of selected elements matches the total number of rows. */
	isAllSelected() {
		return this.tableData.rowsSubject.value.length === this.selection.selected.length;
	}

	/** Selects all rows if they are not all selected; otherwise clear selection. */
	toggleAllRows() {
		if (this.isAllSelected()) {
			this.selection.clear();
		} else {
			this.selection.select(...this.tableData.rowsSubject.value);
		}
	}

	/** The label for the checkbox on the passed row */
	checkboxLabel(row?: any): string {
		if (!row) {
			return `${this.isAllSelected() ? 'deselect' : 'select'} all`;
		}
		return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row ${row.position + 1}`;
	}

	stashUrlParams() {
		this._tableState.setBackUrlParams(
			this.route.snapshot.queryParams.page_index,
			this.route.snapshot.queryParams.page_size,
			this.route.snapshot.queryParams.sort_active,
			this.route.snapshot.queryParams.sort_direction,
		);
		this.stashFilters();
	}

	stashFilters() {
		if (this.activeFilters && Object.keys(this.activeFilters).length > 0) {
			this._tableState.setBackUrlFilters(this.activeFilters);
		} else {
			this._tableState.setBackUrlFilters(null);
		}
	}

	getIdentityFieldsValues() {
		if (this.tableData.identityColumn) return this.selection.selected.map((row) => row[this.tableData.identityColumn]);
		return null;
	}

	handleAction(e, action, element) {
		e.stopPropagation();

		this.activateActions.emit({
			action,
			primaryKeys: [this.tableData.getQueryParams(element)],
			...(this.tableData.identityColumn ? { identityFieldValues: [element[this.tableData.identityColumn]] } : null),
		});
	}

	handleActions(action) {
		const primaryKeys = this.selection.selected.map((row) => this.tableData.getQueryParams(row));
		const identityFieldValues = this.getIdentityFieldsValues();

		this.activateActions.emit({
			action,
			primaryKeys,
			identityFieldValues,
		});
	}

	handleDeleteRow(e, element) {
		e.stopPropagation();
		this.stashFilters();

		this.activateActions.emit({
			action: {
				title: 'Delete row',
				type: 'multiple',
				require_confirmation: true,
			},
			primaryKeys: [this.tableData.getQueryParams(element)],
			...(this.tableData.identityColumn ? { identityFieldValues: [element[this.tableData.identityColumn]] } : null),
		});
	}

	handleViewRow(row: TableRow) {
		this.selectedRowType = 'record';
		this._tableState.selectRow({
			connectionID: this.connectionID,
			tableName: this.name,
			record: row,
			columnsOrder: this.tableData.dataColumns,
			primaryKeys: this.tableData.getQueryParams(row),
			foreignKeys: this.tableData.foreignKeys,
			foreignKeysList: this.tableData.foreignKeysList,
			widgets: this.tableData.widgets,
			widgetsList: this.tableData.widgetsList,
			fieldsTypes: this.tableData.tableTypes,
			relatedRecords: this.tableData.relatedRecords || null,
			link: `/dashboard/${this.connectionID}/${this.name}/entry`,
		});
	}

	handleForeignKeyView(foreignKeys, row) {
		this.selectedRowType = 'foreignKey';

		this._tableState.selectRow({
			connectionID: null,
			tableName: null,
			record: null,
			columnsOrder: null,
			primaryKeys: null,
			foreignKeys: null,
			foreignKeysList: null,
			widgets: null,
			widgetsList: null,
			fieldsTypes: null,
			relatedRecords: null,
			link: null,
		});

		this._tableRow
			.fetchTableRow(this.connectionID, foreignKeys.referenced_table_name, {
				[foreignKeys.referenced_column_name]: row[foreignKeys.referenced_column_name],
			})
			.subscribe((res) => {
				const foreignKeysList = res.foreignKeys.map((foreignKey: TableForeignKey) => foreignKey.column_name);
				const filedsTypes = getTableTypes(res.structure, foreignKeysList);

				const formattedRecord = Object.entries(res.row).reduce((acc, [key, value]) => {
					acc[key] = formatFieldValue(value, filedsTypes[key]);
					return acc;
				}, {});

				this._tableState.selectRow({
					connectionID: this.connectionID,
					tableName: foreignKeys.referenced_table_name,
					record: formattedRecord,
					columnsOrder: res.list_fields,
					primaryKeys: {
						[foreignKeys.referenced_column_name]: res.row[foreignKeys.referenced_column_name],
					},
					foreignKeys: Object.assign(
						{},
						...res.foreignKeys.map((foreignKey: TableForeignKey) => ({ [foreignKey.column_name]: foreignKey })),
					),
					foreignKeysList,
					widgets: Object.assign(
						{},
						...res.table_widgets.map((widget: Widget) => {
							let parsedParams;

							try {
								parsedParams = JSON5.parse(widget.widget_params);
							} catch {
								parsedParams = {};
							}

							return {
								[widget.field_name]: {
									...widget,
									widget_params: parsedParams,
								},
							};
						}),
					),
					widgetsList: res.table_widgets.map((widget) => widget.field_name),
					fieldsTypes: filedsTypes,
					relatedRecords: res.referenced_table_names_and_columns[0],
					link: `/dashboard/${this.connectionID}/${foreignKeys.referenced_table_name}/entry`,
				});
			});
	}

	handleViewAIpanel() {
		this._tableState.handleViewAIpanel();
	}

	isRowSelected(primaryKeys) {
		// console.log('isRowSelected', this.selectedRowType, this.selectedRow, primaryKeys);
		if (this.selectedRowType === 'record' && this.selectedRow && this.selectedRow.primaryKeys !== null)
			return (
				Object.keys(this.selectedRow.primaryKeys).length &&
				JSON.stringify(this.selectedRow.primaryKeys) === JSON.stringify(primaryKeys)
			);
		return false;
	}

	isForeignKeySelected(record, foreignKey: TableForeignKey) {
		const primaryKeyValue = record[foreignKey.referenced_column_name];

		if (this.selectedRowType === 'foreignKey' && this.selectedRow && this.selectedRow.record !== null) {
			return (
				Object.values(this.selectedRow.primaryKeys)[0] === primaryKeyValue &&
				this.selectedRow.tableName === foreignKey.referenced_table_name
			);
		}
		return false;
	}

	showCopyNotification = (message: string) => {
		this._notifications.showSuccessSnackbar(message);
	};

	switchTable(tableName: string) {
		if (tableName && tableName !== this.name) {
			this.router.navigate([`/dashboard/${this.connectionID}/${tableName}`], {
				queryParams: { page_index: 0, page_size: 30 },
			});
		}
	}

	getFolderTables(folder: TableCategory): TableProperties[] {
		return folder.tables || [];
	}


	onFilterSelected($event) {
		console.log('table view fiers filterSelected:', $event);
		this.applyFilter.emit($event);
	}

	get sortedColumns() {
		if (!this.tableData || !this.tableData.columns) {
			return [];
		}
		// Sort columns: visible (selected=true) first, then hidden (selected=false)
		return [...this.tableData.columns].sort((a, b) => {
			if (a.selected === b.selected) return 0;
			return a.selected ? -1 : 1;
		});
	}

	onColumnVisibilityChange() {
		this.tableData.changleColumnList(this.connectionID, this.name);
		this.cdr.detectChanges();
		this._tables
			.updatePersonalTableViewSettings(this.connectionID, this.name, {
				columns_view: this.tableData.displayedDataColumns,
			})
			.subscribe({
				next: () => {
					console.log('Personal table view settings updated with custom ordering');
				},
				error: (error) => {
					console.error('Error updating personal table view settings:', error);
				},
			});
	}

	handleActiveFilterClick(filterKey: string) {
		const dialogRef = this.dialog.open(DbTableFiltersDialogComponent, {
			width: '56em',
			data: {
				connectionID: this.connectionID,
				tableName: this.name,
				displayTableName: this.displayName,
				structure: {
					structure: this.tableData.structure,
					foreignKeys: this.tableData.foreignKeys,
					foreignKeysList: this.tableData.foreignKeysList,
					widgets: this.tableData.widgets || [],
				},
				autofocusField: filterKey,
			},
		});

		dialogRef.afterClosed().subscribe((action) => {
			if (action === 'filter' && dialogRef.componentInstance) {
				const filtersFromDialog = { ...dialogRef.componentInstance.tableRowFieldsShown };
				const comparators = dialogRef.componentInstance.tableRowFieldsComparator;
				this.openFilters.emit({
					structure: this.tableData.structure,
					foreignKeysList: this.tableData.foreignKeysList,
					foreignKeys: this.tableData.foreignKeys,
					widgets: this.tableData.widgets,
					filters: filtersFromDialog,
					comparators: comparators,
				});
			}
		});
	}

	onColumnsMenuDrop(event: CdkDragDrop<string[]>) {
		if (event.previousIndex === event.currentIndex) {
			return;
		}

		// The drag indices are based on sortedColumns (visible first, then hidden)
		// We need to map these to the actual indices in this.tableData.columns
		const sorted = this.sortedColumns;
		const draggedColumn = sorted[event.previousIndex];
		const targetColumn = sorted[event.currentIndex];

		// Find actual indices in the original columns array
		const actualPreviousIndex = this.tableData.columns.findIndex((col) => col.title === draggedColumn.title);
		const actualCurrentIndex = this.tableData.columns.findIndex((col) => col.title === targetColumn.title);

		if (actualPreviousIndex === -1 || actualCurrentIndex === -1) {
			return;
		}

		// Reorder columns array in the menu
		moveItemInArray(this.tableData.columns, actualPreviousIndex, actualCurrentIndex);

		// Update dataColumns array
		this.tableData.dataColumns = this.tableData.columns.map((column) => column.title);

		// Update displayedDataColumns to match the new order (only visible columns)
		const newDisplayedOrder = this.tableData.columns.filter((col) => col.selected).map((col) => col.title);

		this.tableData.displayedDataColumns = newDisplayedOrder;

		// Update full displayed columns list - THIS UPDATES THE TABLE IMMEDIATELY
		if (this.tableData.keyAttributes && this.tableData.keyAttributes.length) {
			this.tableData.displayedColumns = ['select', ...newDisplayedOrder, 'actions'];
		} else {
			this.tableData.displayedColumns = [...newDisplayedOrder];
		}

		// Force Angular to detect changes and re-render the table immediately
		this.cdr.detectChanges();

		this._tables
			.updatePersonalTableViewSettings(this.connectionID, this.name, {
				list_fields: this.tableData.columns.map((col) => col.title),
			})
			.subscribe({
				next: () => {
					console.log('Personal table view settings updated with custom ordering');
				},
				error: (error) => {
					console.error('Error updating personal table view settings:', error);
				},
			});

		console.log('Columns reordered in menu - table updated:', newDisplayedOrder);
	}

	exportData() {
		const convertToCSVValue = (value: any): string => {
			// Handle null and undefined
			if (value === null || value === undefined) {
				return '';
			}

			// Handle nested objects and arrays - convert to JSON string
			if (typeof value === 'object') {
				try {
					value = JSON.stringify(value);
				} catch (_e) {
					value = '[Object]';
				}
			}

			// Convert to string if not already
			const stringValue = String(value);

			// Check if value needs to be quoted (contains comma, double quote, or newline)
			if (
				stringValue.includes(',') ||
				stringValue.includes('"') ||
				stringValue.includes('\n') ||
				stringValue.includes('\r')
			) {
				// Escape double quotes by doubling them and wrap in quotes
				return `"${stringValue.replace(/"/g, '""')}"`;
			}

			return stringValue;
		};

		// Check if there's any selection
		if (!this.selection.selected || this.selection.selected.length === 0) {
			this._notifications.showErrorSnackbar('No rows selected for export');
			return;
		}

		// Use the displayed columns order from the table
		const columnsToExport = this.tableData.displayedDataColumns;

		// Create CSV rows with proper handling of foreign keys
		const csv = this.selection.selected.map((row) =>
			columnsToExport
				.map((fieldName) => {
					let value = row[fieldName];

					if (this.isForeignKey(fieldName) && value && typeof value === 'object') {
						const foreignKey = this.tableData.foreignKeys[fieldName];
						if (foreignKey) {
							value = value[foreignKey.referenced_column_name];
						}
					}

					return convertToCSVValue(value);
				})
				.join(','),
		);

		// Add header row using the same column order
		csv.unshift(columnsToExport.map((h) => convertToCSVValue(h)).join(','));
		const csvArray = csv.join('\r\n');

		const a = document.createElement('a');
		const blob = new Blob([csvArray], { type: 'text/csv' });
		const url = window.URL.createObjectURL(blob);

		a.href = url;
		a.download = 'myFile.csv';
		a.click();
		window.URL.revokeObjectURL(url);
		a.remove();
	}
}
