import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CompanyService } from 'src/app/services/company.service';

@Component({
  selector: 'app-revoke-invitation-dialog',
  templateUrl: './revoke-invitation-dialog.component.html',
  styleUrls: ['./revoke-invitation-dialog.component.css']
})
export class RevokeInvitationDialogComponent {
  public submitting: boolean = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dialogRef: MatDialogRef<RevokeInvitationDialogComponent>,
    private _company: CompanyService,
  ) { }

  revokeInvitation() {
    this._company.revokeInvitation(this.data.companyId, this.data.userEmail)
      .subscribe(() => {
        this.submitting = false;
        this.dialogRef.close();
      },
      () => {},
      () => {this.submitting = false}
    );
  }
}
