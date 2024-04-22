import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Angulartics2 } from 'angulartics2';
import { CompanyService } from 'src/app/services/company.service';

@Component({
  selector: 'app-delete-member-dialog',
  templateUrl: './delete-member-dialog.component.html',
  styleUrls: ['./delete-member-dialog.component.css']
})
export class DeleteMemberDialogComponent {
  public submitting: boolean = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dialogRef: MatDialogRef<DeleteMemberDialogComponent>,
    private _company: CompanyService,
    private angulartics2: Angulartics2,
  ) { }

  deleteCompanyMember() {
    this.submitting = true;
    this._company.removeCompanyMemder(this.data.companyId, this.data.user.id, this.data.user.email, this.data.user.name)
      .subscribe(() => {
        this.angulartics2.eventTrack.next({
          action: 'Company: member is deleted successfully',
        });
        this.submitting = false;
        this.dialogRef.close();
      },
      () => {},
      () => {this.submitting = false}
    );
  }
}
