import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { normalizeTableName } from 'src/app/lib/normalize';
import { CustomAction, CustomActionType } from 'src/app/models/table';
import { ConnectionsService } from 'src/app/services/connections.service';
import { TablesService } from 'src/app/services/tables.service';

@Component({
  selector: 'app-db-table-actions',
  templateUrl: './db-table-actions.component.html',
  styleUrls: ['./db-table-actions.component.css']
})
export class DbTableActionsComponent implements OnInit {
  public connectionID: string | null = null;
  public tableName: string | null = null;
  public normalizedTableName: string;
  public actions: CustomAction[];
  public submitting: false;

  constructor(
    private _connections: ConnectionsService,
    private _tables: TablesService,
    public dialog: MatDialog,
  ) { }

  ngOnInit(): void {
    this.connectionID = this._connections.currentConnectionID;
    this.tableName = this._tables.currentTableName;
    this.normalizedTableName = normalizeTableName(this.tableName);

    this._tables.fetchActions(this.connectionID, this.tableName)
      .subscribe(res => {
        this.actions = res;
      })
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
        label: this.normalizedTableName,
        link: `/dashboard/${this.connectionID}/${this.tableName}`
      },
      {
        label: 'Actions',
        link: null
      }
    ]
  }

  openClearAllActions() {

  }

  addNewAction() {
    this.actions.push({
      title: '',
      type: CustomActionType.Single,
      url: '',
      tableName: '',
      icon: ''
    });
  }

  updateActions() {

  }

  openDeleteActionDialog(index) {

  }
}
