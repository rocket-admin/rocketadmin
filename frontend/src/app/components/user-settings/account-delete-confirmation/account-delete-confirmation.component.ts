import { Component, Inject, OnInit } from '@angular/core';

import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { UserService } from 'src/app/services/user.service';
import { Router } from '@angular/router';
import { Angulartics2 } from 'angulartics2';

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
    private angulartics2: Angulartics2
  ) { }

  ngOnInit(): void {
  }

  deleteAccount() {
    this.submitting = true;
    this._userService.deleteAccount(this.data)
      .subscribe(() => {
        this.angulartics2.eventTrack.next({
          action: 'Delete connection',
          properties: {
            email: this.data.email,
            reason: this.data.reason,
            message: this.data.message
          }
        });
        this.submitting = false;
        this.dialogRef.close();
        },
        undefined,
        () => this.submitting = false
      );
  }

}
