import { CompanyMemberRole } from 'src/app/models/company';
import { CompanyService } from 'src/app/services/company.service';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Angulartics2 } from 'angulartics2';

@Component({
  selector: 'app-invite-member-dialog',
  templateUrl: './invite-member-dialog.component.html',
  styleUrls: ['./invite-member-dialog.component.css']
})
export class InviteMemberDialogComponent {
  public companyMemberEmail: string;
  public companyMemberRole: CompanyMemberRole = CompanyMemberRole.Member;
  public submitting: boolean = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public company: any,
    public dialogRef: MatDialogRef<InviteMemberDialogComponent>,
    private _company: CompanyService,
    private angulartics2: Angulartics2,
  ) { }

  ngOnInit(): void {
    this._company.cast.subscribe();
  }

  addCompanyMember() {
    this.submitting = true;
    this._company.inviteCompanyMember(this.company.id, null, this.companyMemberEmail, this.companyMemberRole)
    .subscribe(() => {
      this.angulartics2.eventTrack.next({
        action: 'Company: member is invited successfully',
      });

      this.submitting = false;
      this.dialogRef.close();
    },
    () => {},
    () => {this.submitting = false});
  }
}
