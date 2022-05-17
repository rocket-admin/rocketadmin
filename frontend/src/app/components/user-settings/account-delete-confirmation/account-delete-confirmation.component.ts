import { Component, Inject, OnInit } from '@angular/core';

import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { UserService } from 'src/app/services/user.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-account-delete-confirmation',
  templateUrl: './account-delete-confirmation.component.html',
  styleUrls: ['./account-delete-confirmation.component.css']
})
export class AccountDeleteConfirmationComponent implements OnInit {

  public submitting: boolean = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private _userService: UserService,
    public dialogRef: MatDialogRef<AccountDeleteConfirmationComponent>,
    public router: Router,
  ) { }

  ngOnInit(): void {
  }

  deleteAccount() {
    this.submitting = true;
    this._userService.deleteAccount(this.data)
      .subscribe(() => {
        this.submitting = false;
        this.dialogRef.close();
        this.router.navigate(['/registration']);
        },
        undefined,
        () => this.submitting = false
      );
  }

}
