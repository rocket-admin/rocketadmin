import { Component, OnInit, ViewChild } from '@angular/core';
import { JsonEditorComponent, JsonEditorOptions } from 'ang-jsoneditor';
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
  @ViewChild(JsonEditorComponent, { static: false }) editor: JsonEditorComponent;

  public connectionID: string | null = null;
  public tableName: string | null = null;
  public normalizedTableName: string;
  public fields: string[] = [];
  public widgets: Widget[] = null;
  public widgetTypes = Object.keys(UIwidgets);
  public submitting: Boolean = false;

  constructor(
    private _connections: ConnectionsService,
    private _tables: TablesService,
    public dialog: MatDialog,
  ) {}

  makeOptions = () => {
    const editorOptions = new JsonEditorOptions();
    editorOptions.statusBar = false;
    editorOptions.mainMenuBar = false;
    return editorOptions;
  }

  ngOnInit(): void {
    this.connectionID = this._connections.currentConnectionID;
    this.tableName = this._tables.currentTableName;
    this.normalizedTableName = normalizeTableName(this.tableName);

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
      widget_params: {},
      name: '',
      description: ''
    });
  }

  selectWidgetField(column_name: string) {
    this.fields.splice(this.fields.indexOf(column_name), 1)
  }

  onWidgetTypeChange(fieldName: string) {
    let currentWidget = this.widgets.find(widget => widget.field_name === fieldName);
    if (currentWidget.widget_type === 'Default') currentWidget.widget_type = '';
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
