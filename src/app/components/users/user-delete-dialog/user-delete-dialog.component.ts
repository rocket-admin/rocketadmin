import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { UsersService } from 'src/app/services/users.service';

@Component({
  selector: 'app-user-delete-dialog',
  templateUrl: './user-delete-dialog.component.html',
  styleUrls: ['./user-delete-dialog.component.css']
})
export class UserDeleteDialogComponent implements OnInit {

  public submitting: boolean = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private _usersService: UsersService,
    public dialogRef: MatDialogRef<UserDeleteDialogComponent>
  ) { }

  ngOnInit(): void {
    this._usersService.cast.subscribe();
  }

  deleteGroupUser() {
    this.submitting = true;
    this._usersService.deleteGroupUser(this.data.user.email, this.data.group.id)
      .subscribe(() => {
        this.dialogRef.close();
        this.submitting = false;
      },
      () => { },
      () => { this.submitting = false; }
    )
  }
}
