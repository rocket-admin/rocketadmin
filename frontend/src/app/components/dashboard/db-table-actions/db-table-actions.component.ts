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
  public submitting: boolean;
  public selectedAction: CustomAction;
  public newAction: CustomAction;
  public codeSnippet = `// No settings required`;
  public emptyActionNameError: boolean;

  public defaultIcons = ['favorite', 'star', 'done', 'arrow_forward', 'key', 'lock', 'visibility', 'language'];

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

  switchActionView(action: CustomAction) {
    this.selectedAction = action;
  }

  openClearAllActions() {

  }

  addNewAction() {
    this.newAction = {
      title: '',
      type: CustomActionType.Single,
      url: '',
      tableName: '',
      icon: ''
    };
  }

  handleAddNewAction() {
    if (this.newAction.title === '') {
      this.emptyActionNameError = true;
    } else {
      this.actions.push(this.newAction);
      this.selectedAction = {... this.newAction};
      this.newAction = null;
    }
  }

  removeAction() {
    this.newAction = null;
  }

  addAction() {
    this.submitting = true;
    this._tables.saveAction(this.connectionID, this.tableName, this.selectedAction)
      .subscribe(res => {
        this.submitting = false;
      },
        () => this.submitting = false,
        () => this.submitting = false
      )
  }

  openDeleteActionDialog(index) {

  }
}
