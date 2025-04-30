import { CompanyMemberRole } from 'src/app/models/company';
import { CompanyService } from 'src/app/services/company.service';
import { Component, Inject } from '@angular/core';
import { Angulartics2 } from 'angulartics2';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { NgForOf, NgIf } from '@angular/common';
import { EmailValidationDirective } from 'src/app/directives/emailValidator.directive';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-invite-member-dialog',
  templateUrl: './invite-member-dialog.component.html',
  styleUrls: ['./invite-member-dialog.component.css'],
  standalone: true,
  imports: [
    NgIf,
    NgForOf,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatMenuModule,
    MatIconModule,
    EmailValidationDirective
  ]
})
export class InviteMemberDialogComponent {
  CompanyMemberRole = CompanyMemberRole;

  public companyMemberEmail: string;
  public companyMemberRole: CompanyMemberRole = CompanyMemberRole.Member;
  public submitting: boolean = false;
  public companyUsersGroup: string = null;
  public groups: {
    title: string,
    groups: object[]
  }[] = [];

  public companyRolesName = {
    'ADMIN': 'Account Owner',
    'DB_ADMIN': 'System Admin',
    'USER': 'Member'
  }

  constructor(
    @Inject(MAT_DIALOG_DATA) public company: any,
    public dialogRef: MatDialogRef<InviteMemberDialogComponent>,
    private _company: CompanyService,
    private angulartics2: Angulartics2,
  ) { }

  ngOnInit(): void {
    this.groups = this.company.connections.sort((a, b) => a.isTestConnection - b.isTestConnection);
  }

  addCompanyMember() {
    this.submitting = true;
    this._company.inviteCompanyMember(this.company.id, this.companyUsersGroup, this.companyMemberEmail, this.companyMemberRole)
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
