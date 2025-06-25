import { ActivatedRoute, RouterModule } from '@angular/router';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { TableField, TableRow, Widget } from 'src/app/models/table';
import { normalizeFieldName, normalizeTableName } from 'src/app/lib/normalize';

import { ClipboardModule } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import { ConnectionsService } from 'src/app/services/connections.service';
import JsonURL from "@jsonurl/jsonurl";
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NotificationsService } from 'src/app/services/notifications.service';
import { PlaceholderRecordViewComponent } from '../../skeletons/placeholder-record-view/placeholder-record-view.component';
import { TableStateService } from 'src/app/services/table-state.service';
import { TablesService } from 'src/app/services/tables.service';
import { formatFieldValue } from 'src/app/lib/format-field-value';

@Component({
  selector: 'app-db-table-row-view',
  templateUrl: './db-table-row-view.component.html',
  styleUrls: ['./db-table-row-view.component.css'],
  imports: [
    MatIconModule,
    MatButtonModule,
    ClipboardModule,
    MatTooltipModule,
    MatExpansionModule,
    MatProgressSpinnerModule,
    MatListModule,
    RouterModule,
    CommonModule,
    PlaceholderRecordViewComponent
  ]
})
export class DbTableRowViewComponent implements OnInit, OnDestroy {
  @Input() activeFilters: object;

  public selectedRowCast: any;
  public selectedRow: TableRow;
  public columns: {
    title: string;
    normalizedTitle: string;
  }[] = [];
  public referencedTables: { table_name: string; displayTableName: string; columns: string[] }[] = [];
  public referencedTablesURLParams: any;
  public referencedRecords: {} = {};

  constructor(
    private _tables: TablesService,
    private _tableState: TableStateService,
    private _notifications: NotificationsService,
    private route: ActivatedRoute,
  ) { }

  ngOnInit(): void {
    // this.connectionID = this._connections.connectionID;

    this.selectedRowCast = this._tableState.cast.subscribe((row) => {
      this.selectedRow = row;
      if (row && row.columnsOrder) {
        const columnsOrder = this.selectedRow.columnsOrder.length ? this.selectedRow.columnsOrder : Object.keys(this.selectedRow.record);

        this.columns = columnsOrder.map(column => {
          return {
            title: column,
            normalizedTitle: row.widgets[column]?.name || normalizeFieldName(column)
          }
        })

        if (row.relatedRecords?.referenced_by?.length) {
          this.referencedRecords = {};

          this.referencedTables = row.relatedRecords.referenced_by
            .map((table: any) => { return {...table, displayTableName: table.display_name || normalizeTableName(table.table_name)}});

          this.referencedTablesURLParams = row.relatedRecords.referenced_by
            .map((table: any) => {
              const params = {[table.column_name]: {
                eq: row.record[row.relatedRecords.referenced_on_column_name]
              }};
              return {
                filters: JsonURL.stringify(params),
                page_index: 0
            }});

          row.relatedRecords.referenced_by.forEach((table: any) => {
            const filters = {[table.column_name]: {
              eq: row.record[row.relatedRecords.referenced_on_column_name]
            }};

            this._tables.fetchTable({
              connectionID: row.connectionID,
              tableName: table.table_name,
              requstedPage: 1,
              chunkSize: 30,
              filters
            }).subscribe((res) => {
              let identityColumn = res.identity_column;
              let fieldsOrder = [];

              const foreignKeyMap = {};
              for (const fk of res.foreignKeys) {
                foreignKeyMap[fk.column_name] = fk.referenced_column_name;
              }

              const tableWidgetsNameMap = Object.keys(res.widgets).reduce((acc, key) => {
                acc[key] = res.widgets[key].name;
                return acc;
              }, {});

              // Format each row
              const formattedRows = res.rows.map(row => {
                const formattedRow = {};

                for (const key in row) {
                  if (foreignKeyMap[key] && typeof row[key] === 'object' && row[key] !== null) {
                    const preferredKey = Object.keys(row[key]).find(k => k !== foreignKeyMap[key]);
                    formattedRow[key] = preferredKey ? row[key][preferredKey] : row[key][foreignKeyMap[key]];
                  } else {
                    formattedRow[key] = formatFieldValue(row[key], res.structure.find((field: TableField) => field.column_name === key)?.data_type || 'text');
                  }
                }
                return formattedRow;
              })

              if (res.identity_column && res.list_fields.length) {
                identityColumn = {
                  isSet: true,
                  fieldName: res.identity_column,
                  displayName: tableWidgetsNameMap[res.identity_column] || normalizeFieldName(res.identity_column)
                };
                fieldsOrder = res.list_fields
                .filter((field: string) => field !== res.identity_column)
                .slice(0, 3)
                .map((field: string) => {
                  return {
                    fieldName: field,
                    displayName: tableWidgetsNameMap[field] || normalizeFieldName(field)
                  };
                });
              }

              if (res.identity_column && !res.list_fields.length) {
                identityColumn = {
                  isSet: true,
                  fieldName: res.identity_column,
                  displayName: tableWidgetsNameMap[res.identity_column] || normalizeFieldName(res.identity_column)
                };
                fieldsOrder = res.structure
                  .filter((field: TableField) => field.column_name !== res.identity_column)
                  .slice(0, 3)
                  .map((field: TableField) => {
                    return {
                      fieldName: field.column_name,
                      displayName: tableWidgetsNameMap[field.column_name] || normalizeFieldName(field.column_name)
                    };
                  });
              }

              if (!res.identity_column && res.list_fields.length) {
                identityColumn = {
                  isSet: false,
                  fieldName: res.list_fields[0],
                  displayName: tableWidgetsNameMap[res.list_fields[0]] || normalizeFieldName(res.list_fields[0])
                };
                fieldsOrder = res.list_fields
                  .slice(1, 4)
                  .map((field: string) => {
                    return {
                      fieldName: field,
                      displayName: tableWidgetsNameMap[field] || normalizeFieldName(field)
                    };
                  });
              }

              if (!res.identity_column && !res.list_fields.length) {
                identityColumn = {
                  isSet: false,
                  fieldName: res.structure[0].column_name,
                  displayName: tableWidgetsNameMap[res.structure[0].column_name] || normalizeFieldName(res.structure[0].column_name)
                };
                console.log(identityColumn);
                fieldsOrder = res.structure
                .slice(1, 4)
                .map((field: TableField) => {
                  return {
                    fieldName: field.column_name,
                    displayName: tableWidgetsNameMap[field.column_name] || normalizeFieldName(field.column_name)
                  };
                });
              }

              const tableRecords = {
                rows: formattedRows,
                links: res.rows.map(row => {
                  return res.primaryColumns.reduce((keys, column) => {
                    if (res.foreignKeys.map(foreignKey => foreignKey.column_name).includes(column.column_name)) {
                      const referencedColumnNameOfForeignKey = foreignKeyMap[column.column_name];
                      keys[column.column_name] = row[column.column_name][referencedColumnNameOfForeignKey];
                    } else {
                      keys[column.column_name] = row[column.column_name];
                    }
                    return keys;
                  }, {})
                }),
                identityColumn,
                fieldsOrder
              }

              this.referencedRecords[table.table_name] = tableRecords;
            });
          });
        }
      }
    });
  }

  ngOnDestroy() {
    this.selectedRowCast.unsubscribe();
  }

  isForeignKey(columnName: string) {
    return this.selectedRow.foreignKeysList.includes(columnName);
  }

  getForeignKeyValue(field: string) {
    if (this.selectedRow && typeof this.selectedRow.record[field] === 'object') {
      const identityColumnName = Object.keys(this.selectedRow.record[field]).find(key => key !== this.selectedRow.foreignKeys[field].referenced_column_name);
      const referencedColumnName = this.selectedRow.foreignKeys[field].referenced_column_name;
      if (identityColumnName) {
        return this.selectedRow.record[field][identityColumnName];
      }
      if (referencedColumnName) {
        return this.selectedRow.record[field][referencedColumnName];
      }
      return this.selectedRow.record[field] || '';
    };
    return this.selectedRow.record[field] || '';
  }

  getForeignKeyQueryParams(field: string) {
    if (this.selectedRow) {
      const referencedColumnName = this.selectedRow.foreignKeys[field].referenced_column_name;
      return {[this.selectedRow.foreignKeys[field]?.referenced_column_name]: this.selectedRow.record[field][referencedColumnName]}
    };
    return {};
  }

  isWidget(columnName: string) {
    return this.selectedRow.widgetsList.includes(columnName);
  }

  getDedicatedPageLinkParams() {
    if (this.selectedRow) {
      const params = {};
      for (const key in this.selectedRow.primaryKeys) {
        if (this.selectedRow.primaryKeys.hasOwnProperty(key)) {
          if (this.selectedRow.foreignKeysList.includes(key)) {
            const referencedColumnName = this.selectedRow.foreignKeys[key].referenced_column_name;
            params[key] = this.selectedRow.record[key][referencedColumnName];
          }
          else {
            params[key] = this.selectedRow.primaryKeys[key];
          }

        }
      }
      return params;
    };
    return {};
  }

  getDedicatedPageLink() {
    if (this.selectedRow) {
      const paramsObj = this.getDedicatedPageLinkParams();
      const params = new URLSearchParams();
      for (const key in paramsObj) {
        if (paramsObj.hasOwnProperty(key)) {
          params.set(key, paramsObj[key]);
        }
      }
      return `${location.origin}${this.selectedRow.link}?${params.toString()}`;
    };
    return '';
  }

  showCopyNotification(message: string) {
    this._notifications.showSuccessSnackbar(message);
  }

  stashUrlParams() {
    this._tableState.setBackUrlParams(this.route.snapshot.queryParams.page_index, this.route.snapshot.queryParams.page_size, this.route.snapshot.queryParams.sort_active, this.route.snapshot.queryParams.sort_direction);
    if (this.activeFilters && Object.keys(this.activeFilters).length > 0) {
      this._tableState.setBackUrlFilters(this.activeFilters);
    } else {
      this._tableState.setBackUrlFilters(null);
    }

    this._tableState.clearSelection();
  }

  handleClose() {
    this._tableState.clearSelection();
  }
}
