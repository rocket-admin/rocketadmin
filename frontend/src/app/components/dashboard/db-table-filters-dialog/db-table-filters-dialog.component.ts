import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TablesService } from 'src/app/services/tables.service';
import { TableField, TableForeignKey } from 'src/app/models/table';
import { ConnectionsService } from 'src/app/services/connections.service';
import { fieldTypes } from 'src/app/consts/field-types';
import { ActivatedRoute } from '@angular/router';
import { getComparators, getFilters } from 'src/app/lib/parse-filter-params';
import { getTableTypes } from 'src/app/lib/setup-table-row-structure';

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
  public tableTypes: Object;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private _connections: ConnectionsService,
    private _tables: TablesService,
    public route: ActivatedRoute
    ) { }

  ngOnInit(): void {
    this._tables.cast.subscribe();
    this._tables.fetchTableStructure(this.data.connectionID, this.data.tableName)
      .subscribe(res => {
        this.tableForeignKeys = res.foreignKeys;
        const foreignKeysList = this.tableForeignKeys.map((field: TableForeignKey) => {return field['column_name']})
        this.fields = res.structure.map((field: TableField) => field.column_name);
        this.tableRowFields = Object.assign({}, ...res.structure.map((field: TableField) => ({[field.column_name]: ''})));
        this.tableTypes = getTableTypes(res.structure, foreignKeysList);
        this.tableRowStructure = Object.assign({}, ...res.structure.map((field: TableField) => {
          return {[field.column_name]: field};
        }));

        const queryParams = this.route.snapshot.queryParams;
        const filters = getFilters(queryParams);

        if (Object.keys(filters).length) {
          this.tableFilters = Object.keys(filters).map(key => key);
          this.tableRowFieldsShown = filters;
          this.tableRowFieldsComparator = getComparators(queryParams);
        } else {
          const fieldsToSearch = res.structure.filter((field: TableField) => field.isSearched);
          if (fieldsToSearch.length) {
            this.tableFilters = fieldsToSearch.map((field:TableField) => field.column_name);
            this.tableRowFieldsShown = Object.assign({}, ...fieldsToSearch.map((field: TableField) => ({[field.column_name]: undefined})));
            this.tableRowFieldsComparator = Object.assign({}, ...fieldsToSearch.map((field: TableField) => ({[field.column_name]: 'eq'})));
          }
        }
      })
  }

  get inputs() {
    return fieldTypes[this._connections.currentConnection.type]
  }

  getRelations = (columnName: string) => {
    const relation = this.tableForeignKeys.find(relation => relation.column_name === columnName);
    return relation;
  }

  trackByFn(index: number) {
    return index; // or item.id
  }

  updateField = (updatedValue: any, field: string) => {
    this.tableRowFieldsShown[field] = updatedValue;
  }

  updateFilterFields() {
    this.tableRowFieldsShown = Object.keys(this.tableRowFields)
      .filter(key => this.tableFilters.includes(key))
      .reduce((value, key) => {
        value[key] = this.tableRowFieldsShown[key];
        return value;
      }, {});

    this.tableRowFieldsComparator = Object.keys(this.tableRowFields)
      .filter(key => this.tableFilters.includes(key))
      .reduce((value, key) => {
        value[key] = this.tableRowFieldsComparator[key] || 'eq';
        return value;
      }, {});
  }

  updateComparator(event, fieldName: string) {
    if (event === 'empty') {
      this.tableRowFieldsComparator[fieldName] = 'eq';
      this.tableRowFieldsShown[fieldName] = ''
    } else {
      this.tableRowFieldsComparator[fieldName] = event;
    };
  }

  resetFilters() {
    this.tableFilters = [];
    this.tableRowFieldsShown = {};
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
}
