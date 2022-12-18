import { Component, OnInit } from '@angular/core';
import { CustomAction, CustomActionType } from 'src/app/models/table';

import { ActionDeleteDialogComponent } from './action-delete-dialog/action-delete-dialog.component';
import { ConnectionsService } from 'src/app/services/connections.service';
import { MatDialog } from '@angular/material/dialog';
import { TablesService } from 'src/app/services/tables.service';
import { normalizeTableName } from 'src/app/lib/normalize';
import { unionBy } from "lodash";
import { HttpErrorResponse } from '@angular/common/http';

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
  public selectedAction: CustomAction = null;
  public newAction: CustomAction =null;
  public codeSnippet = '';
  public actionNameError: string;

  public defaultIcons = ['favorite_outline', 'star_outline', 'done', 'arrow_forward', 'key_outline', 'lock', 'visibility', 'language', 'notifications', 'schedule'];

  constructor(
    private _connections: ConnectionsService,
    private _tables: TablesService,
    public dialog: MatDialog,
  ) { }

  async ngOnInit() {
    this.connectionID = this._connections.currentConnectionID;
    this.tableName = this._tables.currentTableName;
    this.normalizedTableName = normalizeTableName(this.tableName);

    try {
      this.actions = await this.getActions();
      this.selectedAction = this.actions[0];
    } catch(error) {
      if (error instanceof HttpErrorResponse) {
        console.log(error.error.message);
      } else  { throw error };
    }

    this._tables.cast.subscribe(async (arg) =>  {
      if (arg === 'delete-action') {
        this.actions = this.actions.filter((action:CustomAction) => action.id !== this.selectedAction.id)
        try {
          const undatedActions: CustomAction[] = await this.getActions();
          this.actions = unionBy(undatedActions, this.actions, "title");
          this.selectedAction = this.actions[0];
        } catch(error) {
          if (error instanceof HttpErrorResponse) {
            console.log(error.error.message);
          } else  { throw error };
        }
      }
    });
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
      id: '',
      title: '',
      type: CustomActionType.Single,
      url: '',
      tableName: '',
      icon: ''
    };
  }

  handleAddNewAction() {
    this.actionNameError = null;
    if (this.newAction.title === '') {
      this.actionNameError = 'The name cannot be empty.';
    } else {
      const conisidingName = this.actions.find((action: CustomAction) => action.title === this.newAction.title);
      if (!conisidingName) {
        this.selectedAction = {... this.newAction};
        this.actions.push(this.selectedAction);
        this.newAction = null;
      } else {
        this.actionNameError = 'You already hane an action with this name.'
      }
    }
  }

  removeAction(actionTitle?: string) {
    console.log(actionTitle);
    if (actionTitle) {
      this.actions = this.actions.filter((action: CustomAction)  => action.title != actionTitle);
    } else {
      this.newAction = null;
      this.selectedAction = this.actions[0];
    };
  }

  getActions() {
    return this._tables.fetchActions(this.connectionID, this.tableName).toPromise();
  }

  addAction() {
    this.submitting = true;
    if (!this.selectedAction.icon) this.selectedAction.icon = 'add_reaction';
    this._tables.saveAction(this.connectionID, this.tableName, this.selectedAction)
      .subscribe(async (res) => {
        this.submitting = false;
        try {
          const undatedActions: CustomAction[] = await this.getActions();
          this.actions = unionBy(undatedActions, this.actions, "title");
          const currentAction = this.actions.find((action: CustomAction) => action.id === res.id);
          this.selectedAction = currentAction;
        } catch(error) {
          if (error instanceof HttpErrorResponse) {
            console.log(error.error.message);
          } else  { throw error };
        }
      },
        () => this.submitting = false,
        () => this.submitting = false
      )
  }

  updateAction() {
    this.submitting = true;
    this._tables.updateAction(this.connectionID, this.tableName, this.selectedAction)
      .subscribe(async (res) => {
        this.submitting = false;
        try {
          const undatedActions: CustomAction[] = await this.getActions();
          this.actions = unionBy(undatedActions, this.actions, "title");
          const currentAction = this.actions.find((action: CustomAction) => action.id === res.id);
          this.selectedAction = {...currentAction};
        } catch(error) {
          if (error instanceof HttpErrorResponse) {
            console.log(error.error.message);
          } else  { throw error };
        }
      },
        () => this.submitting = false,
        () => this.submitting = false
      )
  }

  openDeleteActionDialog() {
    this.dialog.open(ActionDeleteDialogComponent, {
      width: '25em',
      data: {
        connectionID: this.connectionID,
        tableName: this.tableName,
        action: this.selectedAction
      }
    })
  }
}
