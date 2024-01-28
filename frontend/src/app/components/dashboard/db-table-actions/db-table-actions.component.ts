import { Component, OnInit } from '@angular/core';
import { CustomAction, CustomActionType } from 'src/app/models/table';

import { ActionDeleteDialogComponent } from './action-delete-dialog/action-delete-dialog.component';
import { Angulartics2 } from 'angulartics2';
import { ConnectionsService } from 'src/app/services/connections.service';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { NotificationsService } from 'src/app/services/notifications.service';
import { TablesService } from 'src/app/services/tables.service';
import { Title } from '@angular/platform-browser';
import { codeSnippets } from 'src/app/consts/code-snippets';
import { normalizeTableName } from 'src/app/lib/normalize';
import { unionBy } from "lodash";

@Component({
  selector: 'app-db-table-actions',
  templateUrl: './db-table-actions.component.html',
  styleUrls: ['./db-table-actions.component.css']
})
export class DbTableActionsComponent implements OnInit {
  public connectionID: string | null = null;
  public tableName: string | null = null;
  public normalizedTableName: string;
  public actionsData: {
    table_name: string,
    display_name: string,
    table_actions: CustomAction[]
  };
  public actions: CustomAction[];
  public submitting: boolean;
  public selectedAction: CustomAction = null;
  public updatedActionTitle: string;
  public newAction: CustomAction =null;
  public actionNameError: string;
  public codeSnippets: object;

  public defaultIcons = ['favorite_outline', 'star_outline', 'done', 'arrow_forward', 'key_outline', 'lock', 'visibility', 'language', 'notifications', 'schedule'];

  public codeLangSelected: string = 'cs';
  public signingKey: string;

  constructor(
    private _connections: ConnectionsService,
    private _tables: TablesService,
    private _notifications: NotificationsService,
    public dialog: MatDialog,
    private title: Title,
    private angulartics2: Angulartics2,
  ) { }

  async ngOnInit() {
    this.connectionID = this._connections.currentConnectionID;
    this.signingKey = this._connections.currentConnection.signing_key;
    this.tableName = this._tables.currentTableName;
    this.normalizedTableName = normalizeTableName(this.tableName);
    this.codeSnippets = codeSnippets(this._connections.currentConnection.signing_key);

    try {
      this.actionsData = await this.getActions();
      console.log(this.actionsData);
      this.actions = this.actionsData.table_actions;
      if (this.actions.length) this.setSelectedAction(this.actions[0]);
      this.title.setTitle(`${this.actionsData.display_name || this.normalizedTableName} - Actions | Rocketadmin`);
    } catch(error) {
      if (error instanceof HttpErrorResponse) {
        this.actionsData = null;
        console.log(error.error.message);
      } else  { throw error };
    }

    this._tables.cast.subscribe(async (arg) =>  {
      if (arg === 'delete-action') {
        this.actions = this.actions.filter((action:CustomAction) => action.id !== this.selectedAction.id)
        try {
          const undatedActionsData = await this.getActions();
          this.actions = unionBy(undatedActionsData.table_actions, this.actions, "title");
          if (this.actions.length) this.setSelectedAction(this.actions[0]);
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
        label: this.actionsData.display_name || this.normalizedTableName,
        link: `/dashboard/${this.connectionID}/${this.tableName}`
      },
      {
        label: 'Actions',
        link: null
      }
    ]
  }

  trackByFn(index: number) {
    return index; // or item.id
  }

  setSelectedAction(action: CustomAction) {
    this.selectedAction = action;
    this.updatedActionTitle = action.title;
  }

  updateIcon(icon: string) {
    this.selectedAction.icon = icon;
  }

  switchActionView(action: CustomAction) {
    this.setSelectedAction(action);
  }

  addNewAction() {
    this.newAction = {
      id: '',
      title: '',
      type: CustomActionType.Single,
      url: '',
      tableName: '',
      icon: '',
      requireConfirmation: false
    };
  }

  handleAddNewAction() {
    this.actionNameError = null;
    if (this.newAction.title === '') {
      this.actionNameError = 'The name cannot be empty.';
    } else {
      const coinsidingName = this.actions.find((action: CustomAction) => action.title === this.newAction.title);
      if (!coinsidingName) {
        this.selectedAction = {... this.newAction};
        this.updatedActionTitle = this.selectedAction.title;
        this.actions.push(this.selectedAction);
        this.newAction = null;
      } else {
        this.actionNameError = 'You already have an action with this name.'
      }
    }
  }

  undoAction() {
    this.newAction = null;
    if (this.actions.length) this.setSelectedAction(this.actions[0]);
  }

  handleRemoveAction() {
    if (this.selectedAction.id) {
      this.openDeleteActionDialog();
    } else {
      this.removeActionFromLocalList(this.selectedAction.title)
    }
  }

  removeActionFromLocalList(actionTitle: string) {
    this.actions = this.actions.filter((action: CustomAction)  => action.title != actionTitle);
    if (this.actions.length) this.setSelectedAction(this.actions[0]);
  }

  getActions() {
    return this._tables.fetchActions(this.connectionID, this.tableName).toPromise();
  }

  handleActionSubmetting() {
    if (this.selectedAction.id) {
      this.updateAction();
    } else {
      this.addAction();
    }
  }

  addAction() {
    this.submitting = true;
    if (!this.selectedAction.icon) this.selectedAction.icon = 'add_reaction';
    this._tables.saveAction(this.connectionID, this.tableName, this.selectedAction)
      .subscribe(async (res) => {
        this.submitting = false;
        this.angulartics2.eventTrack.next({
          action: 'Actions: action is saved successfully'
        });
        try {
          const undatedActionsData = await this.getActions();
          this.actions = unionBy(undatedActionsData.table_actions, this.actions, "title");
          const currentAction = this.actions.find((action: CustomAction) => action.id === res.id);
          this.setSelectedAction(currentAction);
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
    if (this.updatedActionTitle) this.selectedAction.title = this.updatedActionTitle;
    this._tables.updateAction(this.connectionID, this.tableName, this.selectedAction)
      .subscribe(async (res) => {
        this.submitting = false;
        try {
          const undatedActionsData = await this.getActions();
          this.actions = this.actions.filter((action: CustomAction)  => action.title != this.selectedAction.id);
          this.actions = unionBy(undatedActionsData.table_actions, this.actions, "title");
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

  showCopyNotification(message: string) {
    this._notifications.showSuccessSnackbar(message);
  }
}
