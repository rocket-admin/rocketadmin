import { Component, OnInit, Inject } from '@angular/core';
import { NgForm } from '@angular/forms';
import { TablesService } from 'src/app/services/tables.service';
import { TableSettings, TableOrdering, TableField } from 'src/app/models/table';
import { ConnectionsService } from 'src/app/services/connections.service';
import { normalizeTableName } from 'src/app/lib/normalize';
import { Router } from '@angular/router';

@Component({
  selector: 'app-db-table-settings',
  templateUrl: './db-table-settings.component.html',
  styleUrls: ['./db-table-settings.component.css']
})
export class DbTableSettingsComponent implements OnInit {

  public connectionID: string | null = null;
  public tableName: string | null = null;
  public displayTableName: string | null = null;
  public submitting: boolean = false;
  public isSettingsExist: boolean = false;
  public loading: boolean = true;
  public fields: string[];
  public fields_to_exclude: string[];
  public tableSettings: TableSettings = {
    connection_id: '',
    table_name: '',
    display_name: '',
    autocomplete_columns: [],
    identity_column: '',
    search_fields: [],
    excluded_fields: [],
    list_fields: [],
    ordering: TableOrdering.Ascending,
    ordering_field: '',
    readonly_fields: [],
    sortable_by: [],
    columns_view: []
  }

  constructor(
    private _tables: TablesService,
    private _connections: ConnectionsService,
    public router: Router,
  ) { }

  ngOnInit(): void {
    this.connectionID = this._connections.currentConnectionID;
    this.tableName = this._tables.currentTableName;
    this.displayTableName = normalizeTableName(this.tableName);
    console.log('ngOnInit connectionID');
    console.log(this.connectionID);
    this._tables.cast.subscribe();
    this._tables.fetchTableStructure(this.connectionID, this.tableName)
      .subscribe(res => {
        console.log('fetchTableStructure subscribe fields');
        console.log(res);
        const primaryKeys = res.primaryColumns.map(primaryColumn => primaryColumn.column_name);
        this.fields = res.structure.map((field: TableField) => field.column_name);
        console.log(this.fields);
        this.fields_to_exclude = this.fields.filter((field) => !primaryKeys.includes(field))
      });
    this._tables.fetchTableSettings(this.connectionID, this.tableName)
      .subscribe(res => {
        this.loading = false;
        if (Object.keys(res).length !== 0) {
          this.isSettingsExist = true
          this.tableSettings = res;
        }
      }
    );
  }

  updateSettings() {
    this.submitting = true;
    this.tableSettings.connection_id =  this.connectionID;
    this.tableSettings.table_name =  this.tableName;

    this._tables.updateTableSettings(this.isSettingsExist, this.connectionID, this.tableName, this.tableSettings)
      .subscribe(() => {
        this.submitting = false;
        this.router.navigate([`/dashboard/${this.connectionID}/${this.tableName}`]);
      },
      () => { },
      () => { this.submitting = false; }
    );
  }

  resetSettings(form: NgForm) {
    this.submitting = true;
    this._tables.deleteTableSettings(this.connectionID, this.tableName)
      .subscribe(() => {
        form.reset();
        this.submitting = false;
      },
        () => { },
        () => { this.submitting = false; }
      )
  }

}
