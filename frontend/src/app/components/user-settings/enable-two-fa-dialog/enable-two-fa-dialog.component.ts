import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { UserService } from 'src/app/services/user.service';
import { GroupDeleteDialogComponent } from '../../users/group-delete-dialog/group-delete-dialog.component';

@Component({
  selector: 'app-enable-two-fa-dialog',
  templateUrl: './enable-two-fa-dialog.component.html',
  styleUrls: ['./enable-two-fa-dialog.component.css']
})
export class EnableTwoFADialogComponent {
  public secondFAQRCode: string;
  public submitting: boolean = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public qr: any,
    public dialogRef: MatDialogRef<GroupDeleteDialogComponent>,
    private _userService: UserService,
  ) {}

  verify2FA() {
    this.submitting = true;

    this._userService.confirm2FA(this.secondFAQRCode)
      .subscribe((res) => {
        if (res.validated) {
          this.secondFAQRCode = '';
          this.submitting = false;
          this.dialogRef.close();
        }
      });
  }
}
