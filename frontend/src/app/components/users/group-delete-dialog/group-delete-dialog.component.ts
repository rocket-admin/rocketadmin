import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Angulartics2 } from 'angulartics2';
import { UsersService } from 'src/app/services/users.service';

@Component({
  selector: 'app-group-delete-dialog',
  templateUrl: './group-delete-dialog.component.html',
  styleUrls: ['./group-delete-dialog.component.css']
})
export class GroupDeleteDialogComponent implements OnInit {

  public submitting: boolean = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private _usersService: UsersService,
    public dialogRef: MatDialogRef<GroupDeleteDialogComponent>,
    private angulartics2: Angulartics2,
  ) { }

  ngOnInit(): void {
    this._usersService.cast.subscribe();
  }

  deleteUsersGroup(id: string) {
    this.submitting = true;
    this._usersService.deleteUsersGroup(id)
      .subscribe( () => {
          this.dialogRef.close();
          this.submitting = false;
          this.angulartics2.eventTrack.next({
            action: 'User groups: user group was deleted successfully',
          });
        },
        () => { },
        () => { this.submitting = false; }
      )
  }
}
