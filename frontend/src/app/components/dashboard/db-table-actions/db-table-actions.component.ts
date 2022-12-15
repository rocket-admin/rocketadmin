import { Component, OnInit } from '@angular/core';
import { CustomAction, CustomActionType } from 'src/app/models/table';

import { ActionDeleteDialogComponent } from './action-delete-dialog/action-delete-dialog.component';
import { ConnectionsService } from 'src/app/services/connections.service';
import { MatDialog } from '@angular/material/dialog';
import { TablesService } from 'src/app/services/tables.service';
import { normalizeTableName } from 'src/app/lib/normalize';

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

  public defaultIcons = ['favorite_outline', 'star_outline', 'done', 'arrow_forward', 'key_outline', 'lock', 'visibility', 'language', 'notifications', 'schedule'];

  constructor(
    private _connections: ConnectionsService,
    private _tables: TablesService,
    public dialog: MatDialog,
  ) { }

  ngOnInit(): void {
    this.connectionID = this._connections.currentConnectionID;
    this.tableName = this._tables.currentTableName;
    this.normalizedTableName = normalizeTableName(this.tableName);

    this.getActions();
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
    this.selectedAction = {...action};
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

  getActions(currentActionId?: string) {
    this._tables.fetchActions(this.connectionID, this.tableName)
      .subscribe(res => {
        this.actions = [...res];
        const currentAction = res.find((action: CustomAction) => action.id === currentActionId)
        if (currentActionId) {
          this.selectedAction = {...currentAction};
        } else {
          this.selectedAction = {...res[0]};
        };
      })
  }

  addAction() {
    this.submitting = true;
    if (!this.selectedAction.icon) this.selectedAction.icon = 'add_reaction';
    this._tables.saveAction(this.connectionID, this.tableName, this.selectedAction)
      .subscribe(res => {
        this.submitting = false;
        this.getActions(res.id);
      },
        () => this.submitting = false,
        () => this.submitting = false
      )
  }

  updateAction() {
    this.submitting = true;
    this._tables.updateAction(this.connectionID, this.tableName, this.selectedAction)
      .subscribe(res => {
        this.submitting = false;
        this.getActions(res.id);
      },
        () => this.submitting = false,
        () => this.submitting = false
      )
  }

  openDeleteActionDialog() {
    const dialogRef = this.dialog.open(ActionDeleteDialogComponent, {
      width: '25em',
      data: {
        connectionID: this.connectionID,
        tableName: this.tableName,
        action: this.selectedAction
      }
    })

    dialogRef.afterClosed().subscribe(action => {
      if (action === 'delete') {
        this.getActions();
      }
    })
  }
}
