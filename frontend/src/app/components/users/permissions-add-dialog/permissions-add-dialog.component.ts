import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { UsersService } from 'src/app/services/users.service';
import { GroupDeleteDialogComponent } from '../group-delete-dialog/group-delete-dialog.component';
import { UserGroup, TablePermission, AccessLevel } from 'src/app/models/user';
import { ConnectionsService } from 'src/app/services/connections.service';

@Component({
  selector: 'app-permissions-add-dialog',
  templateUrl: './permissions-add-dialog.component.html',
  styleUrls: ['./permissions-add-dialog.component.css']
})
export class PermissionsAddDialogComponent implements OnInit {

  public submitting: boolean = false;
  public loading: boolean = true;
  public connectionAccess: AccessLevel;
  public groupAccess: AccessLevel;
  public tablesAccessOptions = 'select';
  public tablesAccess: TablePermission[];
  public connectionID: string;

  constructor(
    @Inject(MAT_DIALOG_DATA) public group: UserGroup,
    private _usersService: UsersService,
    public dialogRef: MatDialogRef<GroupDeleteDialogComponent>,
    private _connections: ConnectionsService
  ) { }

  ngOnInit(): void {
    this.connectionID = this._connections.currentConnectionID;
    this._usersService.fetchPermission(this.connectionID, this.group.id)
      .subscribe( res => {
        this.connectionAccess = res.connection.accessLevel;
        this.groupAccess = res.group.accessLevel;
        this.tablesAccess = res.tables;
        this.loading = false;
      });
  }

  uncheckActions(table: TablePermission) {
    if (!table.accessLevel.visibility) table.accessLevel.readonly = false;
    table.accessLevel.add = false;
    table.accessLevel.delete = false;
    table.accessLevel.edit = false;
  }

  grantFullAccess() {
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
    this._usersService.updatePermission(permissions)
      .subscribe( () => {
        this.dialogRef.close();
        this.submitting = false;
      },
      () => { },
      () => { this.submitting = false; }
    );
  }
}
