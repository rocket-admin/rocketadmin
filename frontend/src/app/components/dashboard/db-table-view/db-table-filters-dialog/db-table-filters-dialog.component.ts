import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, Inject, KeyValueDiffer, KeyValueDiffers, OnInit, Type } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, RouterModule } from '@angular/router';
import JsonURL from '@jsonurl/jsonurl';
import { Angulartics2OnModule } from 'angulartics2';
import JSON5 from 'json5';
import { DynamicModule } from 'ng-dynamic-component';
import { SignalComponentIoModule } from 'ng-dynamic-component/signal-component-io';
import posthog from 'posthog-js';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { UIwidgets as FilterUIwidgets, filterTypes } from 'src/app/consts/filter-types';
import { UIwidgets as EditUIwidgets } from 'src/app/consts/record-edit-types';
import { getComparatorsFromUrl, getFiltersFromUrl } from 'src/app/lib/parse-filter-params';
import { getTableTypes } from 'src/app/lib/setup-table-row-structure';
import { TableField, TableForeignKey, Widget } from 'src/app/models/table';
import { ConnectionsService } from 'src/app/services/connections.service';
import { ContentLoaderComponent } from '../../../ui-components/content-loader/content-loader.component';
import { DefaultFilterComponent } from '../../../ui-components/filter-fields/default-filter/default-filter.component';

@Component({
	selector: 'app-db-table-filters-dialog',
	templateUrl: './db-table-filters-dialog.component.html',
	styleUrls: ['./db-table-filters-dialog.component.css'],
	imports: [
		CommonModule,
		ReactiveFormsModule,
		FormsModule,
		MatAutocompleteModule,
		MatFormFieldModule,
		MatInputModule,
		MatButtonModule,
		MatIconModule,
		DynamicModule,
		SignalComponentIoModule,
		RouterModule,
		MatDialogModule,
		Angulartics2OnModule,
		ContentLoaderComponent,
	],
})
export class DbTableFiltersDialogComponent implements OnInit, AfterViewInit {
	protected posthog = posthog;
	public tableFilters = [];
	public fieldSearchControl = new FormControl('');

	public fields: { key: string; label: string }[];
	public foundFields: Observable<{ key: string; label: string }[]>;

	public tableRowFields: Object;
	public tableRowStructure: Object;
	public tableRowFieldsShown: Record<string, string> = {};
	public tableRowFieldsComparator: Object = {};
	public tableForeignKeys: { [key: string]: TableForeignKey };
	public tableFiltersCount: number;
	public differ: KeyValueDiffer<string, any>;
	public tableTypes: Object;
	public tableWidgets: object;
	public UIwidgets = { ...EditUIwidgets, ...FilterUIwidgets };
	public autofocusField: string | null = null;

	constructor(
		@Inject(MAT_DIALOG_DATA) public data: any,
		private _connections: ConnectionsService,
		public route: ActivatedRoute,
		private differs: KeyValueDiffers,
	) {
		this.differ = this.differs.find({}).create();
	}

	ngOnInit(): void {
		this.tableForeignKeys = { ...this.data.structure.foreignKeys };
		this.tableRowFields = Object.assign(
			{},
			...this.data.structure.structure.map((field: TableField) => ({ [field.column_name]: undefined })),
		);
		this.tableTypes = getTableTypes(this.data.structure.structure, this.data.structure.foreignKeysList);
		this.tableRowStructure = Object.assign(
			{},
			...this.data.structure.structure.map((field: TableField) => {
				return { [field.column_name]: field };
			}),
		);

		if (this.data.autofocusField) {
			this.autofocusField = this.data.autofocusField;
		}

		const queryParams = this.route.snapshot.queryParams;

		if (queryParams.saved_filter) {
			this.tableFilters = [];
			this.tableRowFieldsShown = {};
			this.tableRowFieldsComparator = {};
		} else {
			let filters = {};
			if (queryParams.filters) filters = JsonURL.parse(queryParams.filters);
			const filtersValues = getFiltersFromUrl(filters);

			if (Object.keys(filtersValues).length) {
				this.tableFilters = Object.keys(filtersValues).map((key) => key);
				this.tableRowFieldsShown = filtersValues;
				this.tableRowFieldsComparator = getComparatorsFromUrl(filters);
			} else {
				const fieldsToSearch = this.data.structure.structure.filter((field: TableField) => field.isSearched);
				if (fieldsToSearch.length) {
					this.tableFilters = fieldsToSearch.map((field: TableField) => field.column_name);
					this.tableRowFieldsShown = Object.assign(
						{},
						...fieldsToSearch.map((field: TableField) => ({ [field.column_name]: undefined })),
					);
					this.tableRowFieldsComparator = Object.assign(
						{},
						...fieldsToSearch.map((field: TableField) => ({ [field.column_name]: 'eq' })),
					);
				}
			}
		}

		const widgets = this.data.structure.widgets;
		const widgetsArray = Array.isArray(widgets) ? widgets : Object.values(widgets || {});
		if (widgetsArray.length) {
			this.setWidgets(widgetsArray);
		}

		this.fields = this.data.structure.structure
			.filter((field: TableField) => this.getInputType(field.column_name) !== 'file')
			.map((field: TableField) => ({
				key: field.column_name,
				label: this.getFieldLabel(field.column_name),
			}));

		if (this.autofocusField && this.tableFilters && !this.tableFilters.includes(this.autofocusField)) {
			this.tableFilters.push(this.autofocusField);
			if (!this.tableRowFieldsShown[this.autofocusField]) {
				this.tableRowFieldsShown[this.autofocusField] = undefined;
			}
			if (!this.tableRowFieldsComparator[this.autofocusField]) {
				this.tableRowFieldsComparator[this.autofocusField] = 'eq';
			}
		}

		this.foundFields = this.fieldSearchControl.valueChanges.pipe(
			startWith(''),
			map((value) => this._filter(value || '')),
		);
	}

	ngAfterViewInit(): void {
		if (this.autofocusField) {
			setTimeout(() => {
				this.focusOnField(this.autofocusField);
			}, 200);
		}
	}

	focusOnField(fieldName: string) {
		const selectors = [
			`input[name*="${fieldName}"]`,
			`textarea[name*="${fieldName}"]`,
			`[data-field="${fieldName}"] input`,
			`[data-field="${fieldName}"] textarea`,
			`mat-form-field:has([name*="${fieldName}"]) input`,
			`mat-form-field:has([name*="${fieldName}"]) textarea`,
		];

		for (const selector of selectors) {
			try {
				const element = document.querySelector(selector) as HTMLElement;
				if (element) {
					element.focus();
					element.scrollIntoView({ behavior: 'smooth', block: 'center' });
					return;
				}
			} catch (e) {
				// Continue to next selector if this one fails
			}
		}

		// Fallback: try to find by key attribute in ndc-dynamic components
		const allInputs = document.querySelectorAll('input, textarea');
		for (let i = 0; i < allInputs.length; i++) {
			const input = allInputs[i] as HTMLElement;
			const formField = input.closest('mat-form-field');
			if (formField) {
				const label = formField.querySelector('mat-label');
				if (label && label.textContent && label.textContent.trim() === fieldName) {
					input.focus();
					input.scrollIntoView({ behavior: 'smooth', block: 'center' });
					return;
				}
			}
		}
	}

	isFieldAlreadyFiltered(key: string): boolean {
		return Object.hasOwn(this.tableRowFieldsShown, key);
	}

	getFieldLabel(key: string): string {
		return this.tableWidgets?.[key]?.name || key;
	}

	getFilterComponent(field: string): Type<any> {
		const valueComponent = this.resolveValueComponent(field);
		const innerType = (valueComponent as { type?: string })?.type;
		if (innerType === 'text' || innerType === 'number' || innerType === 'datetime') {
			return DefaultFilterComponent;
		}
		return valueComponent;
	}

	getFilterInputs(field: string): Record<string, any> {
		const valueComponent = this.resolveValueComponent(field);
		const innerType = (valueComponent as { type?: string })?.type;
		const baseInputs: Record<string, any> = {
			key: field,
			label: this.getFieldLabel(field),
			value: this.tableRowFieldsShown[field],
			structure: this.tableRowStructure[field],
			relations: this.tableTypes[field] === 'foreign key' ? this.tableForeignKeys[field] : undefined,
			autofocus: this.autofocusField === field,
		};

		if (innerType === 'text' || innerType === 'number' || innerType === 'datetime') {
			return {
				...baseInputs,
				valueComponent,
				comparator: this.tableRowFieldsComparator[field] || 'eq',
			};
		}

		if (this.isWidget(field)) {
			return { ...baseInputs, widgetStructure: this.tableWidgets[field] };
		}

		return baseInputs;
	}

	private _filter(value: string): { key: string; label: string }[] {
		const v = value.toLowerCase();
		return this.fields.filter((field) => field.key.toLowerCase().includes(v) || field.label.toLowerCase().includes(v));
	}

	ngDoCheck() {
		const change = this.differ.diff(this);
		if (change) {
			this.tableFiltersCount = Object.keys(this.tableRowFieldsShown).length;
		}
	}

	get inputs() {
		return filterTypes[this._connections.currentConnection.type];
	}

	setWidgets(widgets: Widget[]) {
		this.tableWidgets = Object.assign(
			{},
			...widgets.map((widget: Widget) => {
				let params;
				if (typeof widget.widget_params === 'string' && widget.widget_params !== '// No settings required') {
					params = JSON5.parse(widget.widget_params);
				} else if (typeof widget.widget_params !== 'string') {
					params = widget.widget_params;
				} else {
					params = '';
				}
				return {
					[widget.field_name]: { ...widget, widget_params: params },
				};
			}),
		);
	}

	isWidget(columnName: string) {
		return this.tableWidgets && columnName in this.tableWidgets;
	}

	updateField = (updatedValue: any, field: string) => {
		this.tableRowFieldsShown[field] = updatedValue;
	};

	updateComparatorFromComponent = (comparator: string, field: string) => {
		this.tableRowFieldsComparator[field] = comparator;
	};

	addFilter(e) {
		const key = e.option.value;
		this.tableRowFieldsShown = { ...this.tableRowFieldsShown, [key]: this.tableRowFields[key] };
		this.tableRowFieldsComparator = {
			...this.tableRowFieldsComparator,
			[key]: this.tableRowFieldsComparator[key] || 'eq',
		};
		this.fieldSearchControl.setValue('');
	}

	resetFilters() {
		this.tableFilters = [];
		this.tableRowFieldsShown = {};
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

	removeFilter(field) {
		delete this.tableRowFieldsShown[field];
		delete this.tableRowFieldsComparator[field];
	}

	private resolveValueComponent(field: string): Type<any> {
		if (this.isWidget(field)) {
			const widgetType = this.tableWidgets[field].widget_type;
			if (widgetType && this.UIwidgets[widgetType]) {
				return this.UIwidgets[widgetType];
			}
		}
		return this.inputs[this.tableTypes[field]];
	}
}
