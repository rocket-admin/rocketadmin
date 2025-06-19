import * as JSON5 from 'json5';

import { ActivatedRoute, Router } from '@angular/router';
import { Alert, AlertType, ServerError } from 'src/app/models/alert';
import { Component, NgZone, OnInit } from '@angular/core';
import { CustomAction, CustomActionType, CustomEvent, TableField, TableForeignKey, TablePermissions, Widget } from 'src/app/models/table';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatProgressSpinnerModule, MatSpinner } from '@angular/material/progress-spinner';
import { UIwidgets, defaultTimestampValues, fieldTypes, timestampTypes } from 'src/app/consts/field-types';

import { AlertComponent } from '../ui-components/alert/alert.component';
import { BannerComponent } from '../ui-components/banner/banner.component';
import { BbBulkActionConfirmationDialogComponent } from '../dashboard/db-bulk-action-confirmation-dialog/db-bulk-action-confirmation-dialog.component';
import { BreadcrumbsComponent } from '../ui-components/breadcrumbs/breadcrumbs.component';
import { CommonModule } from '@angular/common';
import { CompanyService } from 'src/app/services/company.service';
import { ConnectionsService } from 'src/app/services/connections.service';
import { DBtype } from 'src/app/models/connection';
import { DbActionLinkDialogComponent } from '../dashboard/db-action-link-dialog/db-action-link-dialog.component';
import { DbTableRowViewComponent } from '../dashboard/db-table-row-view/db-table-row-view.component';
import { DynamicModule } from 'ng-dynamic-component';
import JsonURL from "@jsonurl/jsonurl";
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NotificationsService } from 'src/app/services/notifications.service';
import { PlaceholderRowEditComponent } from '../skeletons/placeholder-row-edit/placeholder-row-edit.component';
import { PlaceholderTableViewComponent } from '../skeletons/placeholder-table-view/placeholder-table-view.component';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { TableRowService } from 'src/app/services/table-row.service';
import { TableStateService } from 'src/app/services/table-state.service';
import { TablesService } from 'src/app/services/tables.service';
import { Title } from '@angular/platform-browser';
import { formatFieldValue } from 'src/app/lib/format-field-value';
import { getTableTypes } from 'src/app/lib/setup-table-row-structure';
import { normalizeTableName } from '../../lib/normalize';

@Component({
  selector: 'app-db-table-row-edit',
  templateUrl: './db-table-row-edit.component.html',
  styleUrls: ['./db-table-row-edit.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    MatListModule,
    MatProgressSpinnerModule,
    RouterModule,
    MatExpansionModule,
    MatChipsModule,
    DynamicModule,
    AlertComponent,
    PlaceholderRowEditComponent,
    BannerComponent,
    BreadcrumbsComponent,
    DbTableRowViewComponent
  ]
})
export class DbTableRowEditComponent implements OnInit {
  public loading: boolean = true;
  public connectionID: string | null = null;
  public connectionName: string | null = null;
  public tableName: string | null = null;
  public dispalyTableName: string | null = null;
  public tableRowValues: object;
  public tableRowStructure: object;
  public tableRowRequiredValues: object;
  public identityColumn: string;
  public readonlyFields: string[];
  public nonModifyingFields: string[];
  public keyAttributesFromURL: object = {};
  public hasKeyAttributesFromURL: boolean;
  public dubURLParams: object;
  public keyAttributesFromStructure: [] = [];
  public isPrimaryKeyUpdated: boolean;
  public tableTypes: object;
  public tableWidgets: object;
  public tableWidgetsList: string[] = [];
  public shownRows;
  public submitting = false;
  public UIwidgets = UIwidgets;
  public isServerError: boolean = false;
  public serverError: ServerError;
  public fieldsOrdered: string[];
  public rowActions: CustomAction[];
  public referencedTables: any = [];
  public referencedRecords: {} = {};
  public referencedTablesURLParams: any;
  public isDesktop: boolean = true;
  public permissions: TablePermissions;
  public pageAction: string;
  public tableFiltersUrlString: string;
  public backUrlParams: object;

  public tableForeignKeys: TableForeignKey[];

  public selectedRow: any;
  public relatedRecordsProperties: {};

  public isTestConnectionWarning: Alert = {
    id: 10000000,
    type: AlertType.Error,
    message: 'This is a TEST DATABASE, public to all. Avoid entering sensitive data!'
  }

  private routeSub: Subscription | undefined;
  private confirmationDialogRef: any;

  originalOrder = () => { return 0; }

  constructor(
    private _connections: ConnectionsService,
    private _tables: TablesService,
    private _tableRow: TableRowService,
    private _notifications: NotificationsService,
    private _tableState: TableStateService,
    private _company: CompanyService,
    private route: ActivatedRoute,
    private ngZone: NgZone,
    public router: Router,
    public dialog: MatDialog,
    private title: Title,
  ) { }

  get isTestConnection() {
    return this._connections.currentConnection.isTestConnection;
  }

  get connectionType() {
    return this._connections.currentConnection.type;
  }

  ngOnInit(): void {
    this.loading = true;
    this.connectionID = this._connections.currentConnectionID;
    this.tableFiltersUrlString = JsonURL.stringify(this._tableState.getBackUrlFilters());
    const navUrlParams = this._tableState.getBackUrlParams();
    this.backUrlParams = {
      ...navUrlParams,
      ...(this.tableFiltersUrlString !== 'null' ? { filters: this.tableFiltersUrlString } : {})
    };

    this._tableState.cast.subscribe(row => {
      this.selectedRow = row;
    });

    this.routeSub = this.route.queryParams.subscribe((params) => {
      this.tableName = this.route.snapshot.paramMap.get('table-name');
      if (Object.keys(params).length === 0) {
        this._tables.fetchTableStructure(this.connectionID, this.tableName)
          .subscribe(res => {
            this.dispalyTableName = res.display_name || normalizeTableName(this.tableName);
            this.title.setTitle(`${this.dispalyTableName} - Add new record | ${this._company.companyTabTitle || 'Rocketadmin'}`);
            this.permissions = {
              visibility: true,
              readonly: false,
              add: true,
              delete: true,
              edit: true
            };

            this.keyAttributesFromStructure = res.primaryColumns;
            this.readonlyFields = res.readonly_fields;
            this.tableForeignKeys = res.foreignKeys;
            this.setRowStructure(res.structure);
            res.table_widgets && this.setWidgets(res.table_widgets);
            this.shownRows = this.getModifyingFields(res.structure);
            const allowNullFields = res.structure
              .filter((field: TableField) => field.allow_null)
              .map((field: TableField) => field.column_name);
            this.tableRowValues = Object.assign({}, ...this.shownRows
              .map((field: TableField) => {
                if (allowNullFields.includes(field.column_name)) {
                  return { [field.column_name]: null }
                // } else if (this.tableTypes[field.column_name] === 'boolean') {
                //  return { [field.column_name]: false }
                };
                return {[field.column_name]: ''};
              }));
            if (res.list_fields.length) {
              const shownFieldsList = this.shownRows.map((field: TableField) => field.column_name);
              this.fieldsOrdered = [...res.list_fields].filter(field => shownFieldsList.includes(field));
            } else {
              this.fieldsOrdered = Object.keys(this.tableRowValues).map(key => key);
            }
            this.loading = false;
          })
      } else {
        const { action, ...primaryKeys } = params;
        if (action) {
          this.pageAction = action;
        };

        this.keyAttributesFromURL = primaryKeys;
        this.dubURLParams = {...primaryKeys, action: 'dub'};
        this.hasKeyAttributesFromURL = !!Object.keys(this.keyAttributesFromURL).length;
        this._tableRow.fetchTableRow(this.connectionID, this.tableName, params)
          .subscribe(res => {
            this.dispalyTableName = res.display_name || normalizeTableName(this.tableName);
            this.title.setTitle(`${this.dispalyTableName} - Edit record | Rocketadmin`);
            this.permissions = res.table_access_level;

            this.nonModifyingFields = res.structure.filter((field: TableField) => !this.getModifyingFields(res.structure).some(modifyingField => field.column_name === modifyingField.column_name)).map((field: TableField) => field.column_name);
            this.readonlyFields = [...res.readonly_fields, ...this.nonModifyingFields];
            if (this.connectionType === DBtype.Dynamo) {
              this.readonlyFields = [...this.readonlyFields, ...res.primaryColumns.map((field: TableField) => field.column_name)];
            }
            this.tableForeignKeys = res.foreignKeys;
            // this.shownRows = res.structure.filter((field: TableField) => !field.column_default?.startsWith('nextval'));
            this.tableRowValues = {...res.row};
            if (res.list_fields.length) {
              // const shownFieldsList = this.shownRows.map((field: TableField) => field.column_name);
              this.fieldsOrdered = [...res.list_fields];
            } else {
              this.fieldsOrdered = Object.keys(this.tableRowValues).map(key => key);
            };

            if (this.pageAction === 'dub') {
              this.fieldsOrdered = this.fieldsOrdered.filter(field => !this.nonModifyingFields.includes(field));
            }

            if (res.table_actions) this.rowActions = res.table_actions;
            res.table_widgets && this.setWidgets(res.table_widgets);
            this.setRowStructure(res.structure);
            this.identityColumn = res.identity_column;

            if (res.referenced_table_names_and_columns && res.referenced_table_names_and_columns.length > 0 && res.referenced_table_names_and_columns[0].referenced_by[0] !== null) {
              this.isDesktop = window.innerWidth >= 1280;

              this.referencedTables = res.referenced_table_names_and_columns[0].referenced_by
                .map((table: any) => { return {...table, displayTableName: table.display_name || normalizeTableName(table.table_name)}});

              this.referencedTablesURLParams = res.referenced_table_names_and_columns[0].referenced_by
                .map((table: any) => {
                  const params = {[table.column_name]: {
                    eq: this.tableRowValues[res.referenced_table_names_and_columns[0].referenced_on_column_name]
                  }};
                  return {
                    filters: JsonURL.stringify(params),
                    page_index: 0
                }});

              res.referenced_table_names_and_columns[0].referenced_by.forEach((table: any) => {
                const filters = {[table.column_name]: {
                  eq: this.tableRowValues[res.referenced_table_names_and_columns[0].referenced_on_column_name]
                }};

                this._tables.fetchTable({
                  connectionID: this.connectionID,
                  tableName: table.table_name,
                  requstedPage: 1,
                  chunkSize: 30,
                  filters
                }).subscribe((res) => {

                  this.relatedRecordsProperties = Object.assign({}, this.relatedRecordsProperties, {
                    [table.table_name]: {
                      connectionID: this.connectionID,
                      tableName: table.table_name,
                      columnsOrder: res.list_fields,
                      primaryColumns: res.primaryColumns,
                      foreignKeys: Object.assign({}, ...res.foreignKeys.map((foreignKey: TableForeignKey) => ({[foreignKey.column_name]: foreignKey}))),
                      foreignKeysList: res.foreignKeys.map(fk => fk.column_name),
                      widgets: Object.assign({}, ...res.widgets.map((widget: Widget) => {
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
                      ),
                      widgetsList: res.widgets.map(widget => widget.field_name),
                      relatedRecords: [],
                      link: `/dashboard/${this.connectionID}/${table.table_name}/entry`
                    }
                  });

                  if (res.rows && res.rows.length) {
                    const firstRow = res.rows[0];

                    const relatedTableForeignKeys = Object.assign({}, ...res.foreignKeys.map((foreignKey: TableForeignKey) => ({[foreignKey.column_name]: foreignKey})));

                    this._tableRow.fetchTableRow(
                      this.connectionID,
                      table.table_name,
                      res.primaryColumns.reduce((keys, column) => {
                        if (res.foreignKeys.map(foreignKey => foreignKey.column_name).includes(column.column_name)) {
                          const referencedColumnNameOfForeignKey = relatedTableForeignKeys[column.column_name]?.referenced_column_name;
                          keys[column.column_name] = firstRow[column.column_name][referencedColumnNameOfForeignKey];
                        } else {
                          keys[column.column_name] = firstRow[column.column_name];
                        }
                        return keys;
                      }, {})
                    ).subscribe((res) => {
                      this.relatedRecordsProperties[table.table_name].relatedRecords = res.referenced_table_names_and_columns[0];
                    });
                  }


                  let identityColumn = res.identity_column;
                  let fieldsOrder = [];

                  const foreignKeyMap = {};
                  for (const fk of res.foreignKeys) {
                    foreignKeyMap[fk.column_name] = fk.referenced_column_name;
                  }

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
                    identityColumn = res.identity_column;
                    fieldsOrder = res.list_fields.filter((field: string) => field !== res.identity_column).slice(0, 3);
                  }

                  if (res.identity_column && !res.list_fields.length) {
                    identityColumn = res.identity_column;
                    fieldsOrder = res.structure.filter((field: TableField) => field.column_name !== res.identity_column).map((field: TableField) => field.column_name).slice(0, 3);
                  }

                  if (!res.identity_column && res.list_fields.length) {
                    identityColumn = res.list_fields[0];
                    fieldsOrder = res.list_fields.slice(1, 4);
                  }

                  if (!res.identity_column && !res.list_fields.length) {
                    identityColumn = res.structure[0].column_name;
                    console.log(identityColumn);
                    fieldsOrder = res.structure.slice(1, 4).map((field: TableField) => field.column_name);
                  }

                  const tableRecords = {
                    rawRows: res.rows,
                    formattedRows,
                    links: res.rows.map(row => {
                      let params = {};
                      Object.keys(res.primaryColumns).forEach((key) => {
                        params[res.primaryColumns[key].column_name] = row[res.primaryColumns[key].column_name];
                      });
                      return params;
                    }),
                    identityColumn,
                    fieldsOrder,
                    foreignKeys: res.foreignKeys
                  }
                  this.referencedRecords[table.table_name] = tableRecords;
                });
              });
            }

            this.loading = false;
          },
          (err) => {
            this.loading = false;
            this.isServerError = true;
            this.serverError = {abstract: err.error.message || err.message, details: err.error.originalMessage};
            console.log(err);
          })
      }
    })
  }

  get inputs() {
    return fieldTypes[this.connectionType]
  }

  get currentConnection() {
    return this._connections.currentConnection;
  }

  getCrumbs(name: string) {
    let pageTitle = '';

    if (this.hasKeyAttributesFromURL && this.pageAction === 'dub') {
      pageTitle = 'Duplicate row';
    }

    if (this.hasKeyAttributesFromURL && !this.pageAction) {
      pageTitle = 'Edit row';
    }

    if (!this.hasKeyAttributesFromURL) {
      pageTitle = 'Add row';
    }

    return [
      {
        label: name,
        link: `/dashboard/${this.connectionID}`
      },
      {
        label: this.dispalyTableName,
        link: `/dashboard/${this.connectionID}/${this.tableName}`,
        queryParams: this.backUrlParams
      },
      {
        label: pageTitle,
        link: null
      }
    ]
  }

  setRowStructure(structure: TableField[]) {
    this.tableRowStructure = Object.assign({}, ...structure.map((field: TableField) => {
      return {[field.column_name]: field}
    }))

    const foreignKeysList = this.tableForeignKeys.map((field: TableForeignKey) => {return field['column_name']});
    this.tableTypes = getTableTypes(structure, foreignKeysList);

    this.tableRowRequiredValues = Object.assign({}, ...structure.map((field: TableField) => {
      return {[field.column_name]: field.allow_null === false && field.column_default === null}
    }));
  }

  setWidgets(widgets: Widget[]) {
    this.tableWidgetsList = widgets.map((widget: Widget) => widget.field_name);
    this.tableWidgets = Object.assign({}, ...widgets
      .map((widget: Widget) => {
        let params = null;
        if (widget.widget_params) {
          try {
            params = JSON5.parse(widget.widget_params);
          } catch {
            params = null;
          }
        }
        return {
          [widget.field_name]: {...widget, widget_params: params}
        }
      })
    );
  }

  getRelations = (columnName: string) => {
    const relation = this.tableForeignKeys.find(relation => relation.column_name === columnName);
    return relation;
  }

  isReadonlyField(columnName: string) {
    return this.readonlyFields.includes(columnName);
  }

  isWidget(columnName: string) {
    return this.tableWidgetsList.includes(columnName);
  }

  getModifyingFields(fields) {
    return fields.filter((field: TableField) => !field.auto_increment && !(timestampTypes.includes(field.data_type) && field.column_default && defaultTimestampValues[this.connectionType].includes(field.column_default.toLowerCase().replace(/\(.*\)/, ""))));
  }

  updateField = (updatedValue: any, field: string) => {
    if (typeof(updatedValue) === 'object' && updatedValue !== null) {
      for (const prop of Object.getOwnPropertyNames(this.tableRowValues[field])) {
        delete this.tableRowValues[field][prop];
      }
      Object.assign(this.tableRowValues[field], updatedValue);
    } else {
      this.tableRowValues[field] = updatedValue;
    };

    if (this.keyAttributesFromURL && Object.keys(this.keyAttributesFromURL).includes(field)) {
      this.isPrimaryKeyUpdated = true
    };
  }

  getFormattedUpdatedRow = () => {
    let updatedRow = {...this.tableRowValues};

    //crutch, format datetime fields
    //if no one edit manually datetime field, we have to remove '.000Z', cuz mysql return this format but it doesn't record it

    if (this.connectionType === DBtype.MySQL) {
      const datetimeFields = Object.entries(this.tableTypes)
        .filter(([key, value]) => value === 'datetime');
      if (datetimeFields.length) {
        for (const datetimeField of datetimeFields) {
          if (updatedRow[datetimeField[0]]) {
            updatedRow[datetimeField[0]] = updatedRow[datetimeField[0]].replace('T', ' ').replace('Z', '').split('.')[0];
          }
        }
      };

      const dateFields = Object.entries(this.tableTypes)
        .filter(([key, value]) => value === 'date');
      if (dateFields.length) {
        for (const dateField of dateFields) {
          if (updatedRow[dateField[0]]) {
            updatedRow[dateField[0]] = updatedRow[dateField[0]].split('T')[0];
          }
        }
      };
    }
    //end crutch

    // don't ovverride primary key fields for dynamoDB
    if (this.connectionType === DBtype.Dynamo) {
      const primaryKeyFields = Object.keys(this.keyAttributesFromURL);
      primaryKeyFields.forEach((field) => {
        delete updatedRow[field];
      });
    }

    //parse json fields
    const jsonFields = Object.entries(this.tableTypes)
      .filter(([key, value]) => value === 'json' || value === 'jsonb' || value === 'array' || value === 'object')
      .map(jsonField => jsonField[0]);
    if (jsonFields.length) {
      for (const jsonField of jsonFields) {
        if (updatedRow[jsonField] === '') updatedRow[jsonField] = null;
        if (typeof(updatedRow[jsonField]) === 'string') {
          console.log(updatedRow[jsonField].toString());
          const updatedFiled = JSON.parse(updatedRow[jsonField].toString());
          updatedRow[jsonField] = updatedFiled;
        }
      }
    }

    if (this.pageAction === 'dub') {
      this.nonModifyingFields.forEach((field) => {
        delete updatedRow[field];
      });
    }

    return updatedRow;
  }

  handleRowSubmitting(continueEditing: boolean) {
    if (this.hasKeyAttributesFromURL && this.pageAction !== 'dub') {
      this.updateRow(continueEditing);
    } else {
      this.addRow(continueEditing);
    }
  }

  addRow(continueEditing: boolean) {
    this.submitting = true;

    const formattedUpdatedRow = this.getFormattedUpdatedRow();

    this._tableRow.addTableRow(this.connectionID, this.tableName, formattedUpdatedRow)
      .subscribe((res) => {
        this.keyAttributesFromURL = {};
        for (var i = 0; i < res.primaryColumns.length; i++) {
          this.keyAttributesFromURL[res.primaryColumns[i].column_name] = res.row[res.primaryColumns[i].column_name];
        }
        this.ngZone.run(() => {
          if (continueEditing) {
            this.router.navigate([`/dashboard/${this.connectionID}/${this.tableName}/entry`], { queryParams: this.keyAttributesFromURL });
          } else {
            this.router.navigate([`/dashboard/${this.connectionID}/${this.tableName}`], { queryParams: {
              filters: this.tableFiltersUrlString,
              page_index: 0
            }});
          }
        });

        this.pageAction = null;

        this._notifications.dismissAlert();
        this.submitting = false;
      },
      () => {this.submitting = false},
      () => {this.submitting = false}
    )
  }

  updateRow(continueEditing: boolean) {
    this.submitting = true;

    const formattedUpdatedRow = this.getFormattedUpdatedRow();

    this._tableRow.updateTableRow(this.connectionID, this.tableName, this.keyAttributesFromURL, formattedUpdatedRow)
      .subscribe((res) => {
        this.ngZone.run(() => {
          if (continueEditing) {
            if (this.isPrimaryKeyUpdated) {
              this.ngZone.run(() => {
                let params = {};
                Object.keys(this.keyAttributesFromURL).forEach((key) => {
                  params[key] = res.row[key];
                });
                this.router.navigate([`/dashboard/${this.connectionID}/${this.tableName}/entry`], {
                  queryParams: params
                });
              });
            };
            this._notifications.dismissAlert();
          } else {
            this._notifications.dismissAlert();
            this.router.navigate([`/dashboard/${this.connectionID}/${this.tableName}`], { queryParams: this.backUrlParams});
          }
        });
      },
      () => {this.submitting = false},
      () => {this.submitting = false}
    )
  }

  handleDeleteRow(){
    this.handleActivateAction({
      title: 'Delete row',
      require_confirmation: true
    } as CustomEvent);
  }

  handleActivateAction(action: CustomEvent) {
    if (action.require_confirmation) {
      this.confirmationDialogRef = this.dialog.open(BbBulkActionConfirmationDialogComponent, {
        width: '25em',
        data: {id: action.id, title: action.title, primaryKeys: [this.keyAttributesFromURL]}
      });

      if (!action.id) {
        this.confirmationDialogRef.afterClosed().subscribe((res) => {
          this.router.navigate([`/dashboard/${this.connectionID}/${this.tableName}`], { queryParams: this.backUrlParams});
        });
      }
    } else {
      this._tables.activateActions(this.connectionID, this.tableName, action.id, action.title, [this.keyAttributesFromURL])
        .subscribe((res) => {
          if (res && res.location) this.dialog.open(DbActionLinkDialogComponent, {
            width: '25em',
            data: {href: res.location, actionName: action.title, primaryKeys: this.keyAttributesFromURL}
          })
        })
    }
  }

  handleViewRow(tableName: string, row: {}) {
    // this.selectedRowType = 'record';
    this._tableState.selectRow({
      ...this.relatedRecordsProperties[tableName],
      record: row,
      primaryKeys: this.relatedRecordsProperties[tableName].primaryColumns.reduce((acc, column) => {
        acc[column.column_name] = row[column.column_name];
        return acc;
      }, {}),
    });
  }
}
