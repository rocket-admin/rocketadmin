import * as JSON5 from 'json5';

import { Alert, AlertActionType, AlertType } from 'src/app/models/alert';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { CustomAction, CustomActionType, CustomEvent, TableField, TableForeignKey, Widget } from 'src/app/models/table';
import { catchError, finalize } from 'rxjs/operators';

import { AccessLevel } from 'src/app/models/user';
import { CollectionViewer } from '@angular/cdk/collections';
import { ConnectionsService } from 'src/app/services/connections.service';
import { DataSource } from '@angular/cdk/table';
import { MatPaginator } from '@angular/material/paginator';
import { NotificationsService } from 'src/app/services/notifications.service';
import { TableRowService } from 'src/app/services/table-row.service';
// import { MatSort } from '@angular/material/sort';
import { TablesService } from 'src/app/services/tables.service';
import { UiSettingsService } from 'src/app/services/ui-settings.service';
import { UserService } from 'src/app/services/user.service';
import { filter } from "lodash";
import { formatFieldValue } from 'src/app/lib/format-field-value';
import { getTableTypes } from 'src/app/lib/setup-table-row-structure';
import { normalizeFieldName } from 'src/app/lib/normalize';

interface Column {
  title: string,
  normalizedTitle: string,
  selected: boolean
}

interface RowsParams {
  connectionID: string,
  tableName: string,
  sortColumn?: string,
  requstedPage?: number,
  pageSize?: number,
  sortOrder?: 'ASC' | 'DESC',
  filters?: object,
  comparators?: object,
  search?: string,
  isTablePageSwitched?: boolean,
  shownColumns?: string[]
}

export class TablesDataSource implements DataSource<Object> {

  private rowsSubject = new BehaviorSubject<Object[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);

  public loading$ = this.loadingSubject.asObservable();
  public paginator: MatPaginator;
  // public sort: MatSort;

  public structure;
  public keyAttributes;
  public columns: Column[] = [];
  public dataColumns: string[];
  public dataNormalizedColumns: object;
  public displayedColumns: string[];
  public displayedDataColumns: string[];
  public sortByColumns: string[];
  public foreignKeysList: string[] = [];
  public foreignKeys: TableForeignKey[] = [];
  public widgetsList: string[];
  public widgets: {
    [key: string]: Widget & {
      widget_params: object;
    }
  } = {};
  public widgetsCount: number = 0;
  public selectWidgetsOptions: object;
  public tableTypes: object = {};
  public relatedRecords = {
    referenced_on_column_name: '',
    referenced_by: []
  };
  public permissions;
  public isExportAllowed: boolean;
  public isImportAllowed: boolean;
  public canDelete: boolean;
  public isEmptyTable: boolean;
  public tableActions: CustomAction[];
  public tableBulkActions: CustomAction[];
  public actionsColumnWidth: string;
  public largeDataset: boolean;
  public identityColumn: string;

  public alert_primaryKeysInfo: Alert;
  public alert_settingsInfo: Alert;
  public alert_widgetsWarning: Alert;

  constructor(
    private _tables: TablesService,
    private _connections: ConnectionsService,
    private _uiSettings: UiSettingsService,
    private _tableRow: TableRowService,
  ) {}

  connect(collectionViewer: CollectionViewer): Observable<Object[]> {
    return this.rowsSubject.asObservable();
  }

  disconnect(collectionViewer: CollectionViewer): void {
      this.rowsSubject.complete();
      this.loadingSubject.complete();
  }

  formatRow(row, columns) {
    const rowToFormat = {};
    for (const [columnName, columnStructute] of columns) {
      let type = '';
      if (['number', 'tinyint'].includes(columnStructute.data_type) && (columnStructute.character_maximum_length === 1)) {
        type = 'boolean'
      } else type = columnStructute.data_type;
      rowToFormat[columnName] = formatFieldValue(row[columnName], type);
    }
    return rowToFormat;
  }

  fetchRows({
    connectionID,
    tableName,
    requstedPage,
    pageSize,
    sortColumn,
    sortOrder,
    filters, comparators,
    search,
    isTablePageSwitched,
    shownColumns
  }: RowsParams) {
      this.loadingSubject.next(true);
      this.alert_primaryKeysInfo = null;
      this.alert_settingsInfo = null;
      this.alert_widgetsWarning = null;

      const fetchedTable = this._tables.fetchTable({
        connectionID,
        tableName,
        requstedPage: requstedPage + 1 || 1,
        // chunkSize: this.paginator?.pageSize || 30,
        chunkSize: pageSize || 30,
        sortColumn,
        sortOrder,
        filters,
        comparators,
        search
      });

      if (fetchedTable) {
        fetchedTable
        .pipe(
            catchError(() => of([])),
            finalize(() => this.loadingSubject.next(false))
        )
        .subscribe((res: any) => {
          if (res.rows && res.rows.length) {
            const firstRow = res.rows[0];

            this.foreignKeysList = res.foreignKeys.map((field) => {return field['column_name']});
            this.foreignKeys = Object.assign({}, ...res.foreignKeys.map((foreignKey: TableForeignKey) => ({[foreignKey.column_name]: foreignKey})));

            this._tableRow.fetchTableRow(
              connectionID,
              tableName,
              res.primaryColumns.reduce((keys, column) => {
                if (this.foreignKeysList.includes(column.column_name)) {
                  const referencedColumnNameOfForeignKey = this.foreignKeys[column.column_name].referenced_column_name;
                  keys[column.column_name] = firstRow[column.column_name][referencedColumnNameOfForeignKey];
                } else {
                  keys[column.column_name] = firstRow[column.column_name];
                }
                return keys;
              }, {})
            ).subscribe((res) => this.relatedRecords = res.referenced_table_names_and_columns[0]);
          }
          this.structure = [...res.structure];
          const columns = res.structure
            .reduce((items, item) => {
              items.set(item.column_name, item)
              return items;
            }, new Map());

          if (res.rows) {
            this.isEmptyTable = res.rows.length === 0;
            const formattedRows = res.rows.map(row => this.formatRow(row, columns));
            this.rowsSubject.next(formattedRows);
          } else {
            this.isEmptyTable = true;
          }
          this.keyAttributes = res.primaryColumns;
          this.identityColumn = res.identity_column;
          this.tableActions = res.action_events;
          this.tableBulkActions = res.action_events.filter((action: CustomEvent) => action.type === CustomActionType.Multiple);

          if (res.widgets) {
            this.widgetsList = res.widgets.map((widget: Widget) => {return widget['field_name']});
            this.widgetsCount = this.widgetsList.length;
            this.widgets = Object.assign({}, ...res.widgets.map((widget: Widget) => {
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
              })
            );
          }

          this.tableTypes = getTableTypes(res.structure, this.foreignKeysList);

          let orderedColumns: TableField[];
          if (res.list_fields.length) {
            orderedColumns = res.structure.sort((fieldA: TableField, fieldB: TableField) => res.list_fields.indexOf(fieldA.column_name) - res.list_fields.indexOf(fieldB.column_name));
          } else {
            orderedColumns = [...res.structure];
          };

          if (isTablePageSwitched === undefined) this.columns = orderedColumns
            .filter (item => item.isExcluded === false)
            .map((item, index) => {
              if (shownColumns && shownColumns.length) {
                return {
                  title: item.column_name,
                  normalizedTitle: this.widgets[item.column_name]?.name || normalizeFieldName(item.column_name),
                  selected: shownColumns.includes(item.column_name)
                }
              } else if (res.columns_view && res.columns_view.length !== 0) {
                return {
                  title: item.column_name,
                  normalizedTitle: this.widgets[item.column_name]?.name || normalizeFieldName(item.column_name),
                  selected: res.columns_view.includes(item.column_name)
                }
              } else {
                if (index < 6) {
                  return {
                    title: item.column_name,
                    normalizedTitle: this.widgets[item.column_name]?.name || normalizeFieldName(item.column_name),
                    selected: true
                  }
                }
                return {
                  title: item.column_name,
                  normalizedTitle: this.widgets[item.column_name]?.name || normalizeFieldName(item.column_name),
                  selected: false
                }
              }
            });

          this.dataColumns = this.columns.map(column => column.title);
          this.dataNormalizedColumns = this.columns
            .reduce((normalizedColumns, column) => (normalizedColumns[column.title] = column.normalizedTitle, normalizedColumns), {})
          this.displayedDataColumns = (filter(this.columns, column => column.selected === true)).map(column => column.title);
          this.permissions = res.table_permissions.accessLevel;
          if (this.keyAttributes.length) {
            this.actionsColumnWidth = this.getActionsColumnWidth(this.tableActions, this.permissions);
            this.displayedColumns = ['select', ...this.displayedDataColumns, 'actions'];
          } else {
            this.actionsColumnWidth = '0';
            this.displayedColumns = [...this.displayedDataColumns];
            this.alert_primaryKeysInfo = {
              id: 10000,
              type: AlertType.Info,
              message: 'Add primary keys through your database to be able to work with the table rows.',
              actions: [
                {
                  type: AlertActionType.Anchor,
                  caption: 'Instruction',
                  to: 'https://docs.rocketadmin.com/'
                }
              ]
            }
          };

          this.isExportAllowed = res.allow_csv_export;
          this.isImportAllowed = res.allow_csv_import;
          this.canDelete = res.can_delete;

          this.sortByColumns = res.sortable_by;

          const widgetsConfigured = res.widgets && res.widgets.length;
          if (!res.configured && !widgetsConfigured
            && this._connections.connectionAccessLevel !== AccessLevel.None
            && this._connections.connectionAccessLevel !== AccessLevel.Readonly)
            this.alert_settingsInfo = {
              id: 10001,
              type: AlertType.Info,
              message: 'Configure now to reveal advanced table functionality and features.',
              actions: [
                {
                  type: AlertActionType.Link,
                  caption: 'Settings',
                  to: 'settings'
                },
                {
                  type: AlertActionType.Link,
                  caption: 'Fields display',
                  to: 'widgets'
                }
              ]
            };

          this.largeDataset = res.large_dataset;
          if (this.paginator) this.paginator.pageSize = res.pagination.perPage;
          if (this.paginator) this.paginator.length = res.pagination.total;
      });
    }
  }

  getActionsColumnWidth(actions, permissions) {
    const defaultActionsCount = permissions.edit + permissions.add + (!!permissions.delete && !!this.canDelete);
    const totalActionsCount = actions.length + defaultActionsCount;
    const lengthValue = ((totalActionsCount * 36) + 32);
    return totalActionsCount === 0 ? '0' : `${lengthValue}px`
  }

  changleColumnList(connectionId: string, tableName: string) {
    this.displayedDataColumns = (filter(this.columns, column => column.selected === true)).map(column => column.title);
    if (this.keyAttributes.length) {
      this.displayedColumns = ['select', ...this.displayedDataColumns, 'actions' ]
    } else {
      this.displayedColumns = [...this.displayedDataColumns];
    };

    this._uiSettings.updateTableSetting(connectionId, tableName, 'shownColumns', this.displayedDataColumns);
  }

  getQueryParams(row, action) {
    const params = Object.fromEntries(this.keyAttributes.map((column) => {
      if (this.foreignKeysList.includes(column.column_name)) {
        const referencedColumnNameOfForeignKey = this.foreignKeys[column.column_name].referenced_column_name;
          return [column.column_name, row[column.column_name][referencedColumnNameOfForeignKey]];
        };
      return [column.column_name, row[column.column_name]];
    }));

    if (action === 'dub') {
      return { ...params, action: 'dub' };
    } else {
      return params;
    }
  }
}