import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { UserService } from 'src/app/services/user.service';

@Component({
  selector: 'app-account-password-confirmation',
  templateUrl: './account-password-confirmation.component.html',
  styleUrls: ['./account-password-confirmation.component.css']
})
export class AccountPasswordConfirmationComponent implements OnInit {

  public password: string;
  public submitting: boolean;

  constructor(
    @Inject(MAT_DIALOG_DATA) public userName: any,
    public dialogRef: MatDialogRef<AccountPasswordConfirmationComponent>,
    private _userService: UserService,
  ) { }

  ngOnInit(): void {
  }

  saveUserName() {
    this.submitting = true;
    this._userService.changeUserName(this.userName, this.password)
      .subscribe((res) => {
        this.dialogRef.close();
        this.submitting = false;
      },
      () => { },
      () => { this.submitting = false; }
    )
  }
}
