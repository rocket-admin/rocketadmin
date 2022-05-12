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

  uncheckActions(tableName: string) {
    const tableIndex = this.tablesAccess.findIndex( table => table.tableName === tableName );
    if (!this.tablesAccess[tableIndex].accessLevel.visibility) this.tablesAccess[tableIndex].accessLevel.readonly = false;
    this.tablesAccess[tableIndex].accessLevel.add = false;
    this.tablesAccess[tableIndex].accessLevel.delete = false;
    this.tablesAccess[tableIndex].accessLevel.edit = false;
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
