import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
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
    public dialogRef: MatDialogRef<GroupDeleteDialogComponent>
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
        },
        () => { },
        () => { this.submitting = false; }
      )
  }
}
