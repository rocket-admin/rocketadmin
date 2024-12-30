import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { UsersService } from 'src/app/services/users.service';
import { GroupDeleteDialogComponent } from '../group-delete-dialog/group-delete-dialog.component';
import { UserGroup, TablePermission, AccessLevel } from 'src/app/models/user';
import { ConnectionsService } from 'src/app/services/connections.service';
import { AlertActionType, AlertType } from 'src/app/models/alert';
import { GroupAddDialogComponent } from '../group-add-dialog/group-add-dialog.component';
import { normalizeTableName } from 'src/app/lib/normalize';
import { Angulartics2 } from 'angulartics2';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CommonModule } from '@angular/common';
import { ContentLoaderComponent } from '../../ui-components/content-loader/content-loader.component';
import { AlertComponent } from '../../ui-components/alert/alert.component';

@Component({
  selector: 'app-permissions-add-dialog',
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatCheckboxModule,
    MatIconModule,
    MatSlideToggleModule,
    MatTooltipModule,
    ContentLoaderComponent,
    AlertComponent
  ],
  templateUrl: './permissions-add-dialog.component.html',
  styleUrls: ['./permissions-add-dialog.component.css']
})
export class PermissionsAddDialogComponent implements OnInit {

  public submitting: boolean = false;
  public loading: boolean = true;
  public connectionAccess: AccessLevel;
  public groupAccess: AccessLevel;
  public tablesAccessOptions = 'select';
  public tablesAccess: TablePermission[] = [];
  public connectionID: string;
  public adminGroupAlert = {
    id: 10000,
    type: AlertType.Info,
    message: 'Admin group permissions can\'t be changed, create a new group to configure.',
    actions: [
      {
        type: AlertActionType.Button,
        caption: 'New group',
        action: () => this.handleOpenNewGroupPopup()
      }
    ]
  };
  public connectionFullAccessAlert = {
    id: 10000,
    type: AlertType.Info,
    message: 'Connection full access automatically means full access to group management, view, add, edit and delete all tables\' rows.'
  };

  constructor(
    @Inject(MAT_DIALOG_DATA) public group: UserGroup,
    private _usersService: UsersService,
    public dialogRef: MatDialogRef<GroupDeleteDialogComponent>,
    public dialog: MatDialog,
    private _connections: ConnectionsService,
    private angulartics2: Angulartics2,
  ) { }

  ngOnInit(): void {
    this.connectionID = this._connections.currentConnectionID;
    this._usersService.fetchPermission(this.connectionID, this.group.id)
      .subscribe( res => {
        this.connectionAccess = res.connection.accessLevel;
        this.groupAccess = res.group.accessLevel;
        this.tablesAccess = res.tables.map( table => {return {...table, display_name: table.display_name || normalizeTableName(table.tableName)}} );
        this.loading = false;

        if (this.group.title === 'Admin') this.grantFullTableAccess()
      });
  }

  uncheckActions(table: TablePermission) {
    if (!table.accessLevel.visibility) table.accessLevel.readonly = false;
    table.accessLevel.add = false;
    table.accessLevel.delete = false;
    table.accessLevel.edit = false;
  }

  handleOpenNewGroupPopup() {
    this.dialogRef.close('add_group');
    this.dialog.open(GroupAddDialogComponent, {
      width: '25em',
    });
  }

  grantFullTableAccess() {
    this.tablesAccess.forEach(table => {
      table.accessLevel.add = true;
      table.accessLevel.delete = true;
      table.accessLevel.edit = true;
      table.accessLevel.readonly = false;
      table.accessLevel.visibility = true;
    })
  }

  deselectAllTables() {
    this.tablesAccess.forEach(table => {
      table.accessLevel.add = false;
      table.accessLevel.delete = false;
      table.accessLevel.edit = false;
      table.accessLevel.readonly = false;
      table.accessLevel.visibility = false;
    });
  }

  handleConnectionAccessChange() {
    if (this.connectionAccess === 'edit') {
      this.groupAccess = AccessLevel.Edit;
      this.grantFullTableAccess();
    } else {
      this.deselectAllTables();
    }
  }

  onVisibilityChange(event: Event, index: number) {
    if (!this.tablesAccess[index].accessLevel.visibility) {
      event.preventDefault();
      this.tablesAccess[index].accessLevel.readonly = !this.tablesAccess[index].accessLevel.readonly;
    }
    this.tablesAccess[index].accessLevel.visibility = true;
  }

  onRecordActionPermissionChange(action: string, index: number) {
    this.tablesAccess[index].accessLevel[action] = !this.tablesAccess[index].accessLevel[action];
    this.tablesAccess[index].accessLevel.readonly = false;
    this.tablesAccess[index].accessLevel.visibility = true;
  }

  addPermissions() {
    this.submitting = true;
    let permissions = {
      connection: {
        connectionId: this.connectionID,
        accessLevel: this.connectionAccess
      },
      group: {
        groupId: this.group.id,
        accessLevel: this.groupAccess
      },
      tables: this.tablesAccess
    };
    this._usersService.updatePermission(this.connectionID, permissions)
      .subscribe( () => {
        this.dialogRef.close();
        this.submitting = false;
        this.angulartics2.eventTrack.next({
          action: 'User groups: user group permissions were updated successfully',
        });
      },
      () => { },
      () => { this.submitting = false; }
    );
  }
}
