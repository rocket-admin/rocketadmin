import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, Inject, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { Angulartics2, Angulartics2OnModule } from 'angulartics2';
import { DynamicModule } from 'ng-dynamic-component';
import { SignalComponentIoModule } from 'ng-dynamic-component/signal-component-io';
import posthog from 'posthog-js';
import { map, Observable, startWith } from 'rxjs';
import { ContentLoaderComponent } from 'src/app/components/ui-components/content-loader/content-loader.component';
import { UIwidgets as FilterUIwidgets, filterTypes } from 'src/app/consts/filter-types';
import { UIwidgets as EditUIwidgets } from 'src/app/consts/record-edit-types';
import { getTableTypes } from 'src/app/lib/setup-table-row-structure';
import { TableField } from 'src/app/models/table';
import { ConnectionsService } from 'src/app/services/connections.service';
import { TablesService } from 'src/app/services/tables.service';

@Component({
	selector: 'app-saved-filters-dialog',
	imports: [
		CommonModule,
		ReactiveFormsModule,
		FormsModule,
		MatAutocompleteModule,
		MatFormFieldModule,
		MatInputModule,
		MatButtonModule,
		MatIconModule,
		MatSelectModule,
		MatSlideToggleModule,
		MatMenuModule,
		MatCheckboxModule,
		MatRadioModule,
		DynamicModule,
		SignalComponentIoModule,
		RouterModule,
		MatDialogModule,
		MatSnackBarModule,
		ContentLoaderComponent,
		Angulartics2OnModule,
		MatTooltipModule,
	],
	templateUrl: './saved-filters-dialog.component.html',
	styleUrl: './saved-filters-dialog.component.css',
})
export class SavedFiltersDialogComponent implements OnInit, AfterViewInit {
	public tableFilters = [];
	public fieldSearchControl = new FormControl('');
	public fields: string[];
	public foundFields: Observable<string[]>;

	public tableRowFields: Object;
	public tableRowStructure: Object;
	public tableRowFieldsShown: Object = {};
	public tableRowFieldsComparator: Object = {};
	public tableFiltersCount: number = 0;
	public tableTypes: Object;
	public tableWidgets: object;
	public UIwidgets = { ...EditUIwidgets, ...FilterUIwidgets };
	public dynamicColumn: string | null = null;
	public showAddConditionField = false;
	public showNameError = false;
	public showConditionsError = false;

	@ViewChild('tableFiltersForm') tableFiltersForm: any;

	constructor(
		@Inject(MAT_DIALOG_DATA) public data: any,
		private _tables: TablesService,
		private _connections: ConnectionsService,
		private dialogRef: MatDialogRef<SavedFiltersDialogComponent>,
		private snackBar: MatSnackBar,
		private angulartics2: Angulartics2,
		private elementRef: ElementRef,
	) {}

	ngOnInit(): void {
		if (this.data.filtersSet) {
			this.tableRowFieldsShown = Object.entries(this.data.filtersSet.filters).reduce((acc, [field, conditions]) => {
				const [_comparator, value] = Object.entries(conditions)[0];
				acc[field] = value;
				return acc;
			}, {});

			this.tableRowFieldsComparator = Object.entries(this.data.filtersSet.filters).reduce(
				(acc, [field, conditions]) => {
					const [comparator] = Object.keys(conditions);
					acc[field] = comparator;
					return acc;
				},
				{},
			);

			if (this.data.filtersSet.dynamic_column?.column_name) {
				this.tableRowFieldsShown[this.data.filtersSet.dynamic_column.column_name] = null;
				this.tableRowFieldsComparator[this.data.filtersSet.dynamic_column.column_name] =
					this.data.filtersSet.dynamic_column.comparator || '';
				this.dynamicColumn = this.data.filtersSet.dynamic_column.column_name;
			}
		}

		this.tableRowFields = Object.assign(
			{},
			...this.data.structure.map((field: TableField) => ({ [field.column_name]: undefined })),
		);
		const foreignKeysList = Object.keys(this.data.tableForeignKeys);
		this.tableTypes = getTableTypes(this.data.structure, foreignKeysList);
		this.fields = this.data.structure
			.filter((field: TableField) => this.getInputType(field.column_name) !== 'file')
			.map((field: TableField) => field.column_name);

		this.tableRowStructure = Object.assign(
			{},
			...this.data.structure.map((field: TableField) => {
				return { [field.column_name]: field };
			}),
		);

		const tableWidgets = this.data.tableWidgets;
		if (tableWidgets && Object.keys(tableWidgets).length) {
			this.tableWidgets = tableWidgets;
		}

		this.foundFields = this.fieldSearchControl.valueChanges.pipe(
			startWith(''),
			map((value) => this._filter(value || '')),
		);
	}

	ngAfterViewInit(): void {
		if (this.data.filtersSet && this.data.filtersSet.id) {
			setTimeout(() => {
				const nameInput = this.elementRef.nativeElement.querySelector(
					'input[name="filters_set_name"]',
				) as HTMLInputElement;
				if (nameInput && document.activeElement === nameInput) {
					nameInput.blur();
				}
			}, 100);
		}
	}

	get hasSelectedFilters(): boolean {
		return Object.keys(this.tableRowFieldsShown).length > 0;
	}

	handleAddConditionButtonClick(): void {
		this.showAddConditionField = true;
		setTimeout(() => {
			const input = this.elementRef.nativeElement.querySelector('input[name="filter_columns"]') as HTMLInputElement;
			input?.focus();
		}, 0);
	}

	cancelAddConditionInput(): void {
		this.showAddConditionField = false;
		this.fieldSearchControl.setValue('');
	}

	private _filter(value: string): string[] {
		return this.fields.filter((field: string) => field.toLowerCase().includes(value.toLowerCase()));
	}

	get inputs() {
		return filterTypes[this._connections.currentConnection.type];
	}

	trackByFn(_index: number, item: any) {
		return item.key;
	}

	isWidget(columnName: string) {
		return this.tableWidgets && columnName in this.tableWidgets;
	}

	updateComparatorFromComponent = (comparator: string, field: string) => {
		this.tableRowFieldsComparator[field] = comparator;
	};

	updateField = (updatedValue: any, field: string) => {
		this.tableRowFieldsShown[field] = updatedValue;
		this.updateFiltersCount();
		if (this.showConditionsError && Object.keys(this.tableRowFieldsShown).length > 0) {
			this.showConditionsError = false;
		}
	};

	addFilter(e) {
		const key = e.option.value;
		this.tableRowFieldsShown = { ...this.tableRowFieldsShown, [key]: this.tableRowFields[key] };
		this.tableRowFieldsComparator = {
			...this.tableRowFieldsComparator,
			[key]: this.tableRowFieldsComparator[key] || 'eq',
		};
		this.fieldSearchControl.setValue('');
		this.updateFiltersCount();
		this.showConditionsError = false;
		if (this.hasSelectedFilters) {
			this.showAddConditionField = false;
		}
	}

	handleInputBlur(): void {
		if (!this.fieldSearchControl.value || this.fieldSearchControl.value.trim() === '') {
			setTimeout(() => {
				if (!this.fieldSearchControl.value || this.fieldSearchControl.value.trim() === '') {
					this.cancelAddConditionInput();
				}
			}, 200);
		}
	}

	updateComparator(event, fieldName: string) {
		if (event === 'empty') this.tableRowFieldsShown[fieldName] = '';
	}

	removeFilters() {
		this._tables.deleteSavedFilter(this.data.connectionID, this.data.tableName, this.data.filtersSet.id).subscribe({
			next: () => {
				this.dialogRef.close(true);
			},
			error: (error) => {
				console.error('Error removing filters:', error);
				this.snackBar.open('Error removing filters', 'Close', { duration: 3000 });
			},
		});
	}

	getInputType(field: string) {
		let widgetType;
		if (this.isWidget(field)) {
			widgetType = this.UIwidgets[this.tableWidgets[field].widget_type]?.type;
		} else {
			widgetType = this.inputs[this.tableTypes[field]]?.type;
		}
		return widgetType;
	}

	getComparatorType(typeOfComponent) {
		if (typeOfComponent === 'text') {
			return 'text';
		} else if (typeOfComponent === 'number' || typeOfComponent === 'datetime') {
			return 'number';
		} else {
			return 'nonComparable';
		}
	}

	getOperatorIcon(operator: string): string {
		const iconMap: { [key: string]: string } = {
			startswith: 'play_arrow',
			endswith: 'play_arrow',
			eq: 'drag_handle',
			contains: 'search',
			icontains: 'block',
			empty: 'space_bar',
			gt: 'keyboard_arrow_right',
			lt: 'keyboard_arrow_left',
			gte: 'keyboard_double_arrow_right',
			lte: 'keyboard_double_arrow_left',
		};
		return iconMap[operator] || 'drag_handle';
	}

	removeFilter(field) {
		delete this.tableRowFieldsShown[field];
		delete this.tableRowFieldsComparator[field];
		if (this.dynamicColumn === field) {
			this.dynamicColumn = null;
		}
		this.updateFiltersCount();
		this.showConditionsError = false;
		if (!this.hasSelectedFilters) {
			this.showAddConditionField = false;
		}
	}

	updateFiltersCount() {
		this.tableFiltersCount = Object.keys(this.tableRowFieldsShown).length;
	}

	toggleDynamicColumn(field: string) {
		if (this.dynamicColumn === field) {
			this.dynamicColumn = null;
		} else {
			this.dynamicColumn = field;
		}
	}

	handleSaveFilters() {
		this.showNameError = false;
		this.showConditionsError = false;

		if (!this.data.filtersSet.name || this.data.filtersSet.name.trim() === '') {
			this.showNameError = true;
			setTimeout(() => {
				const nameInput = this.elementRef.nativeElement.querySelector(
					'input[name="filters_set_name"]',
				) as HTMLInputElement;
				if (nameInput) {
					nameInput.focus();
					nameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
				}
			}, 0);
			return;
		}

		const hasRegularFilters = Object.keys(this.tableRowFieldsShown).some((key) => {
			if (key === this.dynamicColumn) {
				return false;
			}
			return this.tableRowFieldsComparator[key] !== undefined && this.tableRowFieldsComparator[key] !== null;
		});

		const hasDynamicColumnFilter =
			this.dynamicColumn &&
			this.tableRowFieldsComparator[this.dynamicColumn] !== undefined &&
			this.tableRowFieldsComparator[this.dynamicColumn] !== null;

		if (!hasRegularFilters && !hasDynamicColumnFilter) {
			this.showConditionsError = true;
			setTimeout(() => {
				const conditionInput = this.elementRef.nativeElement.querySelector(
					'input[name="filter_columns"]',
				) as HTMLInputElement;
				if (conditionInput) {
					conditionInput.focus();
					conditionInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
				} else {
					const addButton = this.elementRef.nativeElement.querySelector('.add-condition-footer button') as HTMLElement;
					if (addButton) {
						addButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
					}
				}
			}, 0);
			return;
		}

		let payload;
		if (Object.keys(this.tableRowFieldsShown).length) {
			let filters = {};

			for (const key in this.tableRowFieldsShown) {
				if (key === this.dynamicColumn) {
					continue;
				}

				if (this.tableRowFieldsComparator[key] !== undefined) {
					const value =
						this.tableRowFieldsShown[key] === '' || this.tableRowFieldsShown[key] === undefined
							? null
							: this.tableRowFieldsShown[key];

					filters[key] = {
						[this.tableRowFieldsComparator[key]]: value,
					};
				}
			}

			payload = {
				name: this.data.filtersSet.name,
				filters,
			};

			if (this.dynamicColumn) {
				payload.dynamic_column = {
					column_name: this.dynamicColumn,
					comparator: this.tableRowFieldsComparator[this.dynamicColumn] || '',
				};
			}

			if (this.data.filtersSet.id) {
				this._tables
					.updateSavedFilter(this.data.connectionID, this.data.tableName, this.data.filtersSet.id, payload)
					.subscribe(
						() => {
							this.dialogRef.close(true);
						},
						(error) => {
							console.error('Error updating filter:', error);
							this.snackBar.open('Error updating filter', 'Close', { duration: 3000 });
						},
					);
			} else {
				this._tables.createSavedFilter(this.data.connectionID, this.data.tableName, payload).subscribe(
					() => {
						this.angulartics2.eventTrack.next({
							action: 'Saved filters: saved filter is created successfully',
						});
						posthog.capture('Saved filters: saved filter is created successfully');
						this.dialogRef.close(true);
					},
					(error) => {
						this.angulartics2.eventTrack.next({
							action: 'Saved filters: error creating saved filter',
						});
						posthog.capture('Saved filters: error creating saved filter');
						console.error('Error saving filter:', error);
						this.snackBar.open('Error saving filter', 'Close', { duration: 3000 });
					},
				);
			}
		}
	}
}
