import { Component, OnInit, Inject } from '@angular/core';
import { UsersService } from 'src/app/services/users.service';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { UserGroup } from 'src/app/models/user';

@Component({
  selector: 'app-user-add-dialog',
  templateUrl: './user-add-dialog.component.html',
  styleUrls: ['./user-add-dialog.component.css']
})
export class UserAddDialogComponent implements OnInit {

  public submitting: boolean = false;
  public groupUserEmail: string = '';
  public responseMessage: string = null;

  constructor(
    @Inject(MAT_DIALOG_DATA) public group: UserGroup,
    private _usersService: UsersService,
    // private dialogRef: MatDialogRef<UserAddDialogComponent>
  ) { }

  ngOnInit(): void {
    this._usersService.cast.subscribe();
  }

  joinGroupUser() {
    this.submitting = true;
    this._usersService.addGroupUser(this.group.id, this.groupUserEmail)
      .subscribe((res) => {
          // this.dialogRef.close();
          this.responseMessage = res.message;
          this.submitting = false;
        },
        () => { },
        () => { this.submitting = false; }
      )
  }
}
