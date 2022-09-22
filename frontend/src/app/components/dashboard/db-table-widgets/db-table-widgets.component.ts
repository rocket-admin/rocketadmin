import { Component, OnInit, ViewChild } from '@angular/core';
import { TableField, Widget } from 'src/app/models/table';

import { ConnectionsService } from 'src/app/services/connections.service';
import { MatDialog } from '@angular/material/dialog';
import { TablesService } from 'src/app/services/tables.service';
import { UIwidgets } from "src/app/consts/field-types";
import { WidgetDeleteDialogComponent } from './widget-delete-dialog/widget-delete-dialog.component';
import { difference } from "lodash";
import { normalizeTableName } from 'src/app/lib/normalize';

@Component({
  selector: 'app-db-table-widgets',
  templateUrl: './db-table-widgets.component.html',
  styleUrls: ['./db-table-widgets.component.css']
})
export class DbTableWidgetsComponent implements OnInit {

  public connectionID: string | null = null;
  public tableName: string | null = null;
  public normalizedTableName: string;
  public fields: string[] = [];
  public widgets: Widget[] = null;
  public widgetTypes = Object.keys(UIwidgets);
  public submitting: boolean = false;
  public widgetsWithSettings: string[];
  public defaultParams = {
    Boolean: 'No settings required',
    Date: 'No settings required',
    Time: 'No settings required',
    DateTime: 'No settings required',
    JSON: 'No settings required',
    Textarea: 'No settings required',
    String: 'No settings required',
    Readonly: 'No settings required',
    Number: 'No settings required',
    Select:
`// provide array of options to map database value (key 'value') in human readable value (key 'label');
// for example:
// AK => Alaska,
// CA => California

{
  options: [
    {
      value: 'AK',
      label: 'Alaska'
    },
    {
      value: 'CA',
      label: 'California'
    }
  ]
}`,
    Password:
`// provide algorithm to encrypt your password, one of:
//sha1, sha3, sha224, sha256, sha512, sha384, bcrypt, scrypt, argon2, pbkdf2.
// example:

{
  algorithm: 'sha224'
}

`,
    File:
`// provide type of file: 'hex', 'base64' or 'file'
// example:
{
  type: 'hex'
}
`
  }

  constructor(
    private _connections: ConnectionsService,
    private _tables: TablesService,
    public dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.connectionID = this._connections.currentConnectionID;
    this.tableName = this._tables.currentTableName;
    this.normalizedTableName = normalizeTableName(this.tableName);
    this.widgetsWithSettings = Object
      .entries(this.defaultParams)
      .filter(([key, value]) => value !== 'No settings required')
      .map(widgetDefault => widgetDefault[0]);
    // console.log(settings);
    // this.widgetsWithSettings = Object.keys(settings);

    this._tables.fetchTableStructure(this.connectionID, this.tableName)
      .subscribe(res => {
        this.fields = res.structure.map((field: TableField) => field.column_name);
        this.getWidgets();
      })
  }

  addNewWidget() {
    this.widgets.push({
      field_name: '',
      widget_type: '',
      widget_params: '',
      name: '',
      description: ''
    });

    console.log(this.widgets);
  }

  selectWidgetField(column_name: string) {
    this.fields.splice(this.fields.indexOf(column_name), 1)
  }

  onWidgetTypeChange(currentWidget: Widget) {
    // let currentWidget = this.widgets.find(widget => widget.field_name === fieldName);
    if (currentWidget.widget_type === 'Default') currentWidget.widget_type = '';

    //default widget settings:
    currentWidget.widget_params = this.defaultParams[currentWidget.widget_type];
  }

  isReadOnly(type: string) {
    return !this.widgetsWithSettings.includes(type);
  }

  onWidgetParamsChange(event, fieldName: string) {
    let currentWidget = this.widgets.find(widget => widget.field_name === fieldName);
    if (!currentWidget.widget_params) currentWidget.widget_params = {};
    for (const prop of Object.getOwnPropertyNames(currentWidget.widget_params)) {
      delete currentWidget.widget_params[prop];
    }
    Object.assign(currentWidget.widget_params, event);
  }

  openDeleteWidgetDialog(widgetFieldName: string) {
    const dialogRef = this.dialog.open(WidgetDeleteDialogComponent, {
      width: '25em',
      data: widgetFieldName
    })

    dialogRef.afterClosed().subscribe(action => {
      if (action === 'delete') {
        this.fields.push(widgetFieldName);
        this.widgets = this.widgets.filter((widget: Widget) => widget.field_name !== widgetFieldName);
        this.updateWidgets();
      }
    })
  }

  openClearAllConfirmation() {
    const dialogRef = this.dialog.open(WidgetDeleteDialogComponent, {
      width: '25em'
    })

    dialogRef.afterClosed().subscribe(action => {
      if (action === 'delete') {
        const widgetsToDelete = this.widgets.map(widget => widget.field_name);
        this.fields = [...this.fields, ...widgetsToDelete];
        this.widgets = [];
        this.updateWidgets();
      }
    })
  }

  getWidgets() {
    this._tables.fetchTableWidgets(this.connectionID, this.tableName)
    .subscribe(res => {
      const currentWidgetTypes = res.map((widget: Widget) => widget.field_name);
      this.fields = difference(this.fields, currentWidgetTypes);
      this.widgets = res
    });
  }

  updateWidgets() {
    this.submitting = true;
    this._tables.updateTableWidgets(this.connectionID, this.tableName, this.widgets)
      .subscribe(res => {
        this.submitting = false;
        this.getWidgets();
      },
      undefined,
      () => {this.submitting = false});
  }
}
