import { Component, OnInit } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { Angulartics2 } from 'angulartics2';
import { ConnectionsService } from 'src/app/services/connections.service';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { UsersService } from 'src/app/services/users.service';

@Component({
  selector: 'app-group-add-dialog',
  imports: [
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  templateUrl: './group-add-dialog.component.html',
  styleUrls: ['./group-add-dialog.component.css']
})
export class GroupAddDialogComponent implements OnInit {

  public connectionID: string;
  public groupTitle: string = '';
  public submitting: boolean = false;

  constructor(
    private _connections: ConnectionsService,
    public _usersService: UsersService,
    public dialogRef: MatDialogRef<GroupAddDialogComponent>,
    private angulartics2: Angulartics2,
  ) { }

  ngOnInit(): void {
    this.connectionID = this._connections.currentConnectionID;
    this._usersService.cast.subscribe();
  }

  addGroup() {
    this.submitting = true;
    this._usersService.createUsersGroup(this.connectionID, this.groupTitle)
    .subscribe(
      () => {
        this.submitting = false;
        this.dialogRef.close();
        this.angulartics2.eventTrack.next({
          action: 'User groups: user groups was created successfully',
        });
      },
      () => { },
      () => { this.submitting = false; }
    );
  }
}
