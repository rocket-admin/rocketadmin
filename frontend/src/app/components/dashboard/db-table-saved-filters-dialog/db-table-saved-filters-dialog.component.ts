import { Component, OnInit, Inject, KeyValueDiffers, KeyValueDiffer } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { TablesService } from 'src/app/services/tables.service';
import { TableField, TableForeignKey, Widget } from 'src/app/models/table';
import { ConnectionsService } from 'src/app/services/connections.service';
import { UIwidgets } from 'src/app/consts/field-types';
import { filterTypes } from 'src/app/consts/filter-types';
import { ActivatedRoute } from '@angular/router';
import { getComparatorsFromUrl, getFiltersFromUrl } from 'src/app/lib/parse-filter-params';
import { getTableTypes } from 'src/app/lib/setup-table-row-structure';
import * as JSON5 from 'json5';
import { map, startWith } from 'rxjs/operators';
import { Observable, Subject } from 'rxjs';
import { FormControl } from '@angular/forms';
import JsonURL from "@jsonurl/jsonurl";
import { DynamicModule } from 'ng-dynamic-component';
import { RouterModule } from '@angular/router';
import { MatDialogModule } from '@angular/material/dialog';
import { ContentLoaderComponent } from '../../ui-components/content-loader/content-loader.component';
import { Angulartics2OnModule } from 'angulartics2';

@Component({
  selector: 'app-db-table-saved-filters-dialog',
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
    DynamicModule,
    RouterModule,
    MatDialogModule,
    Angulartics2OnModule,
    ContentLoaderComponent
  ],
  templateUrl: './db-table-saved-filters-dialog.component.html',
  styleUrl: './db-table-saved-filters-dialog.component.css'
})
export class DbTableSavedFiltersDialogComponent {
  public filterName: string;
  public tableFilters = [];
  public fieldSearchControl = new FormControl('');

  public fields: string[];
  public foundFields: Observable<string[]>;

  public tableRowFields: Object;
  public tableRowStructure: Object;
  public tableRowFieldsShown: Object = {};
  public tableRowFieldsComparator: Object = {};
  public tableForeignKeys: {[key: string]: TableForeignKey};
  public tableFiltersCount: number;
  public differ: KeyValueDiffer<string, any>;
  public tableTypes: Object;
  public tableWidgets: object;
  public tableWidgetsList: string[] = [];
  public UIwidgets = UIwidgets;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private _connections: ConnectionsService,
    private _tables: TablesService,
    public route: ActivatedRoute,
    private differs:  KeyValueDiffers
  ) {
    this.differ = this.differs.find({}).create();
  }

  ngOnInit(): void {
    this._tables.cast.subscribe();
    this.tableForeignKeys = {...this.data.structure.foreignKeys};
    this.tableRowFields = Object.assign({}, ...this.data.structure.structure.map((field: TableField) => ({[field.column_name]: undefined})));
    this.tableTypes = getTableTypes(this.data.structure.structure, this.data.structure.foreignKeysList);
    this.fields = this.data.structure.structure
      .filter((field: TableField) => this.getInputType(field.column_name) !== 'file')
      .map((field: TableField) => field.column_name);
    // this.foundFields = [...this.fields];
    this.tableRowStructure = Object.assign({}, ...this.data.structure.structure.map((field: TableField) => {
      return {[field.column_name]: field};
    }));

    const filters = this.data.savedFilters;
    const filtersValues = getFiltersFromUrl(filters);

    if (Object.keys(filtersValues).length) {
      this.tableFilters = Object.keys(filtersValues).map(key => key);
      this.tableRowFieldsShown = filtersValues;
      this.tableRowFieldsComparator = getComparatorsFromUrl(filters);
    } else {
      const fieldsToSearch = this.data.structure.structure.filter((field: TableField) => field.isSearched);
      if (fieldsToSearch.length) {
        this.tableFilters = fieldsToSearch.map((field:TableField) => field.column_name);
        this.tableRowFieldsShown = Object.assign({}, ...fieldsToSearch.map((field: TableField) => ({[field.column_name]: undefined})));
        this.tableRowFieldsComparator = Object.assign({}, ...fieldsToSearch.map((field: TableField) => ({[field.column_name]: 'eq'})));
      }
    }

    this.data.structure.widgets.length && this.setWidgets(this.data.structure.widgets);

    this.foundFields = this.fieldSearchControl.valueChanges.pipe(
      startWith(''),
      map(value => this._filter(value || '')),
    );
  }

  private _filter(value: string): string[] {
    return this.fields.filter((field: string) => field.toLowerCase().includes(value.toLowerCase()));
  }

  ngDoCheck() {
    const change = this.differ.diff(this);
    if (change) {
      this.tableFiltersCount = Object.keys(this.tableRowFieldsShown).length;
    }
  }

  get inputs() {
    return filterTypes[this._connections.currentConnection.type]
  }

  setWidgets(widgets: Widget[]) {
    this.tableWidgetsList = widgets.map((widget: Widget) => widget.field_name);
    this.tableWidgets = Object.assign({}, ...widgets
      .map((widget: Widget) => {
        let params;
        if (widget.widget_params !== '// No settings required') {
          params = JSON5.parse(widget.widget_params);
        } else {
          params = '';
        };
        return {
          [widget.field_name]: {...widget, widget_params: params}
        }
      })
    );
  }

  trackByFn(index: number, item: any) {
    return item.key; // or item.id
  }

  isWidget(columnName: string) {
    return this.tableWidgetsList.includes(columnName);
  }

  updateField = (updatedValue: any, field: string) => {
    this.tableRowFieldsShown[field] = updatedValue;
  }

  addFilter(e) {
    const key = e.option.value;
    this.tableRowFieldsShown = {...this.tableRowFieldsShown, [key]: this.tableRowFields[key]};
    this.tableRowFieldsComparator = {...this.tableRowFieldsComparator, [key]: this.tableRowFieldsComparator[key] || 'eq'};
    this.fieldSearchControl.setValue('');
  }

  updateComparator(event, fieldName: string) {
    if (event === 'empty') this.tableRowFieldsShown[fieldName] = '';
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
    };
    return widgetType;
  }

  getComparatorType(typeOfComponent) {
    if (typeOfComponent === 'text') {
      return 'text'
    } else if (typeOfComponent === 'number' || typeOfComponent === 'datetime') {
      return 'number'
    } else {
      return 'nonComparable'
    }
  }

  removeFilter(field) {
    delete this.tableRowFieldsShown[field];
    delete this.tableRowFieldsComparator[field];
  }
}
