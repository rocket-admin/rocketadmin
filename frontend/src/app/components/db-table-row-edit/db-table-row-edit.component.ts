import * as JSON5 from 'json5';

import { ActivatedRoute, Router } from '@angular/router';
import { Component, NgZone, OnInit } from '@angular/core';
import { CustomAction, TableField, TableForeignKey, Widget } from 'src/app/models/table';
import { UIwidgets, fieldTypes } from 'src/app/consts/field-types';

import { ConnectionsService } from 'src/app/services/connections.service';
import { DBtype } from 'src/app/models/connection';
import { DbActionConfirmationDialogComponent } from '../dashboard/db-action-confirmation-dialog/db-action-confirmation-dialog.component';
import { DbActionLinkDialogComponent } from '../dashboard/db-action-link-dialog/db-action-link-dialog.component';
import { Location } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { NotificationsService } from 'src/app/services/notifications.service';
import { ServerError } from 'src/app/models/alert';
import { TableRowService } from 'src/app/services/table-row.service';
import { TablesService } from 'src/app/services/tables.service';
import { Title } from '@angular/platform-browser';
import { getTableTypes } from 'src/app/lib/setup-table-row-structure';
import { normalizeTableName } from '../../lib/normalize';

@Component({
  selector: 'app-db-table-row-edit',
  templateUrl: './db-table-row-edit.component.html',
  styleUrls: ['./db-table-row-edit.component.css']
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
  public keyAttributesFromURL: object = {};
  public hasKeyAttributesFromURL: boolean;
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
  public referencedTables: any;
  public referencedTablesURLParams: any;

  public tableForeignKeys: TableForeignKey[];

  originalOrder = () => { return 0; }

  constructor(
    private _connections: ConnectionsService,
    private _tables: TablesService,
    private _tableRow: TableRowService,
    private _notifications: NotificationsService,
    private _location: Location,
    private route: ActivatedRoute,
    private ngZone: NgZone,
    public router: Router,
    public dialog: MatDialog,
    private title: Title,
  ) { }

  ngOnInit(): void {
    this.loading = true;
    this.connectionID = this._connections.currentConnectionID;
    this.tableName = this._tables.currentTableName;

    this.route.queryParams.subscribe((params) => {
      if (Object.keys(params).length === 0) {
        this._tables.fetchTableStructure(this.connectionID, this.tableName)
          .subscribe(res => {
            this.dispalyTableName = res.display_name || normalizeTableName(this.tableName);
            this.title.setTitle(`${this.dispalyTableName} - Add new record | Rocketadmin`);

            this.keyAttributesFromStructure = res.primaryColumns;
            this.readonlyFields = res.readonly_fields;
            this.tableForeignKeys = res.foreignKeys;
            this.setRowStructure(res.structure);
            res.table_widgets && this.setWidgets(res.table_widgets);
            this.shownRows = res.structure.filter((field: TableField) => !field.auto_increment);
            const allowNullFields = res.structure
              .filter((field: TableField) => field.allow_null)
              .map((field: TableField) => field.column_name);
            this.tableRowValues = Object.assign({}, ...this.shownRows
              .map((field: TableField) => {
                if (allowNullFields.includes(field.column_name)) {
                  return { [field.column_name]: null }
                } else if (this.tableTypes[field.column_name] === 'boolean') {
                  return { [field.column_name]: false }
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
        this.keyAttributesFromURL = params;
        this.hasKeyAttributesFromURL = !!Object.keys(this.keyAttributesFromURL).length;
        this._tableRow.fetchTableRow(this.connectionID, this.tableName, params)
          .subscribe(res => {
            this.dispalyTableName = res.display_name || normalizeTableName(this.tableName);
            this.title.setTitle(`${this.dispalyTableName} - Edit record | Rocketadmin`);

            const autoincrementFields = res.structure.filter((field: TableField) => field.auto_increment).map((field: TableField) => field.column_name);
            this.readonlyFields = [...res.readonly_fields, ...autoincrementFields];
            this.tableForeignKeys = res.foreignKeys;
            // this.shownRows = res.structure.filter((field: TableField) => !field.column_default?.startsWith('nextval'));
            this.tableRowValues = {...res.row};
            if (res.list_fields.length) {
              // const shownFieldsList = this.shownRows.map((field: TableField) => field.column_name);
              this.fieldsOrdered = [...res.list_fields];
            } else {
              this.fieldsOrdered = Object.keys(this.tableRowValues).map(key => key);
            }
            if (res.table_actions) this.rowActions = res.table_actions;
            res.table_widgets && this.setWidgets(res.table_widgets);
            this.setRowStructure(res.structure);
            this.identityColumn = res.identity_column;

            if (res.referenced_table_names_and_columns && res.referenced_table_names_and_columns[0].referenced_by[0] !== null) {
              this.referencedTables = res.referenced_table_names_and_columns[0].referenced_by
                .map((table: any) => { return {...table, displayTableName: table.display_name || normalizeTableName(table.table_name)}});
              this.referencedTablesURLParams = res.referenced_table_names_and_columns[0].referenced_by
                .map((table: any) => { return {
                  [`f__${table.column_name}__eq`]:
                  this.tableRowValues[res.referenced_table_names_and_columns[0].referenced_on_column_name],
                  page_index: 0
                }});;
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
    return fieldTypes[this._connections.currentConnection.type]
  }

  get currentConnection() {
    return this._connections.currentConnection;
  }

  getCrumbs(name: string) {
    return [
      {
        label: name,
        link: `/dashboard/${this.connectionID}`
      },
      {
        label: this.dispalyTableName,
        link: `/dashboard/${this.connectionID}/${this.tableName}`
      },
      {
        label: this.hasKeyAttributesFromURL ? 'Edit row' : 'Add row',
        link: null
      }
    ]
  }

  goBack() {
    console.log(this._location);
    if (window.history.length > 1) {
      this._location.back()
    } else {
      this.router.navigate([`/dashboard/${this.connectionID}/${this.tableName}`])
    }
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

  isReadonly(columnName: string) {
    return this.readonlyFields.includes(columnName);
  }

  isWidget(columnName: string) {
    return this.tableWidgetsList.includes(columnName);
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
    if (this._connections.currentConnection.type === DBtype.MySQL) {
      const datetimeFields = Object.entries(this.tableTypes)
        .filter(([key, value]) => value === 'datetime');
      if (datetimeFields.length) {
        for (const datetimeField of datetimeFields) {
          if (updatedRow[datetimeField[0]]) updatedRow[datetimeField[0]] = updatedRow[datetimeField[0]].split('.')[0];
        }
      }
    }
    //end crutch

    //parse json fields
    const jsonFields = Object.entries(this.tableTypes)
      .filter(([key, value]) => value === 'json' || value === 'jsonb')
      .map(jsonField => jsonField[0]);
    if (jsonFields.length) {
      for (const jsonField of jsonFields) {
        if (updatedRow[jsonField] !== null) {
          const updatedFiled = JSON.parse(updatedRow[jsonField].toString());
          updatedRow[jsonField] = updatedFiled;
        }
      }
    }

    return updatedRow;
  }

  handleRowSubmitting() {
    if (this.hasKeyAttributesFromURL) {
      this.updateRow();
    } else {
      this.addRow();
    }
  }

  addRow(continueEditing?: boolean) {
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
            this.router.navigate([`/dashboard/${this.connectionID}/${this.tableName}`]);
          }
        });
        this._notifications.dismissAlert();
        this.submitting = false;
      },
      () => {this.submitting = false},
      () => {this.submitting = false}
    )
  }

  updateRow(continueEditing?: boolean) {
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
            this.goBack();
            // this.router.navigate([`/dashboard/${this.connectionID}/${this.tableName}`]);
          }
        });
      },
      undefined,
      () => {this.submitting = false}
    )
  }

  handleActivateAction(action: CustomAction) {
    if (action.requireConfirmation) {
      this.dialog.open(DbActionConfirmationDialogComponent, {
        width: '25em',
        data: {id: action.id, title: action.title, primaryKeys: this.keyAttributesFromURL}
      });
    } else {
      this._tables.activateAction(this.connectionID, this.tableName, action.id, action.title, this.keyAttributesFromURL)
        .subscribe((res) => {
          if (res && res.location) this.dialog.open(DbActionLinkDialogComponent, {
            width: '25em',
            data: {href: res.location, actionName: action.title, primaryKeys: this.keyAttributesFromURL}
          })
        })
    }
  }
}
