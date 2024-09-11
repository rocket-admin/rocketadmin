import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { GroupDeleteDialogComponent } from '../../users/group-delete-dialog/group-delete-dialog.component';
import { UserService } from 'src/app/services/user.service';
import { ApiKey } from 'src/app/models/user';

@Component({
  selector: 'app-api-key-delete-dialog',
  templateUrl: './api-key-delete-dialog.component.html',
  styleUrl: './api-key-delete-dialog.component.css'
})
export class ApiKeyDeleteDialogComponent {

  public submitting: boolean = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ApiKey,
    private _userService: UserService,
    public dialogRef: MatDialogRef<GroupDeleteDialogComponent>
  ) { }

  deleteAPIkey() {
    this.submitting = true;
    this._userService.deleteAPIkey(this.data)
      .subscribe( () => {
          this.dialogRef.close();
          this.submitting = false;
        },
        () => { },
        () => { this.submitting = false; }
      )
  }
}
