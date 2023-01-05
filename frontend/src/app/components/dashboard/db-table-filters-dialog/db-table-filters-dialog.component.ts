import { Component, OnInit, Inject, KeyValueDiffers, KeyValueDiffer } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TablesService } from 'src/app/services/tables.service';
import { TableField, TableForeignKey, Widget } from 'src/app/models/table';
import { ConnectionsService } from 'src/app/services/connections.service';
import { fieldTypes, UIwidgets } from 'src/app/consts/field-types';
import { ActivatedRoute } from '@angular/router';
import { getComparators, getFilters } from 'src/app/lib/parse-filter-params';
import { getTableTypes } from 'src/app/lib/setup-table-row-structure';
import * as JSON5 from 'json5';
import { omit } from "lodash";

@Component({
  selector: 'app-db-table-filters-dialog',
  templateUrl: './db-table-filters-dialog.component.html',
  styleUrls: ['./db-table-filters-dialog.component.css']
})
export class DbTableFiltersDialogComponent implements OnInit {

  public tableFilters = [];

  public fields: string[];
  public tableRowFields: Object;
  public tableRowStructure: Object;
  public tableRowFieldsShown: Object = {};
  public tableRowFieldsComparator: Object = {};
  public tableForeignKeys: TableForeignKey[];
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
    this.tableForeignKeys = this.data.structure.foreignKeys;
    this.tableRowFields = Object.assign({}, ...this.data.structure.structure.map((field: TableField) => ({[field.column_name]: ''})));
    this.tableTypes = getTableTypes(this.data.structure.structure, this.data.structure.foreignKeysList);
    this.fields = this.data.structure.structure
      .filter((field: TableField) => this.getInputType(field.column_name) !== 'file')
      .map((field: TableField) => field.column_name);
    this.tableRowStructure = Object.assign({}, ...this.data.structure.structure.map((field: TableField) => {
      return {[field.column_name]: field};
    }));

    const queryParams = this.route.snapshot.queryParams;
    const filters = getFilters(queryParams);

    if (Object.keys(filters).length) {
      this.tableFilters = Object.keys(filters).map(key => key);
      this.tableRowFieldsShown = filters;
      this.tableRowFieldsComparator = getComparators(queryParams);
    } else {
      const fieldsToSearch = this.data.structure.structure.filter((field: TableField) => field.isSearched);
      if (fieldsToSearch.length) {
        this.tableFilters = fieldsToSearch.map((field:TableField) => field.column_name);
        this.tableRowFieldsShown = Object.assign({}, ...fieldsToSearch.map((field: TableField) => ({[field.column_name]: undefined})));
        this.tableRowFieldsComparator = Object.assign({}, ...fieldsToSearch.map((field: TableField) => ({[field.column_name]: 'eq'})));
      }
    }

    this.data.structure.widgets.length && this.setWidgets(this.data.structure.widgets);
  }

  ngDoCheck() {
    const change = this.differ.diff(this);
    if (change) {
      this.tableFiltersCount = Object.keys(this.tableRowFieldsShown).length;
    }

  }

  get inputs() {
    return fieldTypes[this._connections.currentConnection.type]
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

  getRelations = (columnName: string) => {
    const relation = this.tableForeignKeys[columnName];
    return relation;
  }

  trackByFn(index: number) {
    return index; // or item.id
  }

  isWidget(columnName: string) {
    return this.tableWidgetsList.includes(columnName);
  }

  updateField = (updatedValue: any, field: string) => {
    this.tableRowFieldsShown[field] = updatedValue;
  }

  addFilter(e) {
    const key = e.value;
    this.tableRowFieldsShown = {...this.tableRowFieldsShown, [key]: this.tableRowFields[key]};
    this.tableRowFieldsComparator = {...this.tableRowFieldsComparator, [key]: this.tableRowFieldsComparator[key] || 'eq'};
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
    this.tableRowFieldsShown = omit(this.tableRowFieldsShown, [field]);
    this.tableRowFieldsComparator = omit(this.tableRowFieldsComparator, [field]);
  }
}
