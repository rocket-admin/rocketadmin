import { InviteMemberDialogComponent } from './invite-member-dialog/invite-member-dialog.component';
import { Company } from 'src/app/models/company';
import { CompanyService } from 'src/app/services/company.service';
import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { SubscriptionPlans } from 'src/app/models/user';
import { UserService } from 'src/app/services/user.service';
import { orderBy } from "lodash";
import { DeleteMemberDialogComponent } from './delete-member-dialog/delete-member-dialog.component';
import { RevokeInvitationDialogComponent } from './revoke-invitation-dialog/revoke-invitation-dialog.component';
import { Angulartics2 } from 'angulartics2';

@Component({
  selector: 'app-company',
  templateUrl: './company.component.html',
  styleUrls: ['./company.component.css']
})
export class CompanyComponent {

  public company: Company = null;
  public members: any = null;
  public currentPlan: string;
  public isAnnually: boolean;
  public submitting: boolean;
  public usersCount: number;
  public adminsCount: number;
  public membersTableDisplayedColumns: string[] = ['email', 'name', 'role', 'twoFA', 'actions'];
  // public invitationsTableDisplayColumns: string[] = ['invitedUserEmail', 'role'];
  public submittingChangedName: boolean =false;
  public currentUser;

  constructor(
    private _company: CompanyService,
    private _user: UserService,
    // private _notifications: NotificationsService,
    public dialog: MatDialog,
    private angulartics2: Angulartics2,
    // private title: Title
  ) { }

  ngOnInit() {
    this._company.fetchCompany().subscribe(res => {
      this.company = res;

      this.setCompanyPlan(res.subscriptionLevel);

      this.getCompanyMembers(res.id);
    });

    this._company.cast.subscribe( arg =>  {
      if (arg === 'invited' || arg === 'revoked') {
        this.getCompany()
      }
      else if (arg === 'user delete') {
        this.getCompanyMembers(this.company.id);
      };
    });

  }

  getCompany() {
    return this._company.fetchCompany().subscribe(res => this.company = {...res});
  }

  getCompanyMembers(companyId: string) {
    this._company.fetchCompanyMembers(companyId).subscribe(res => {
      if (this.company.invitations) {
          this.company.invitations.map( (invitee: any) =>  {
          invitee.email = invitee.invitedUserEmail;
          invitee.pending = true;
        })
      } else {
        this.company.invitations = [];
      };
      this._user.cast
        .subscribe(user => {
          this.currentUser = res.find(member => member.email === user.email);

          const currentMembers = orderBy(res, ['role', 'email']);
          if (this.currentUser.role === 'ADMIN') {
            const userIndex = currentMembers.findIndex(user => user.email === this.currentUser.email);

            if (userIndex !== -1) {
              const user = currentMembers.splice(userIndex, 1)[0];
              currentMembers.unshift(user);
            }
          }

          this.members = [...currentMembers, ...this.company.invitations];
      });
      this.adminsCount = res.filter(user => user.role === 'ADMIN').length;
      this.usersCount = this.company.invitations.length + res.length;
    });
  }

  setCompanyPlan(subscriptionLevel: SubscriptionPlans) {
    if (subscriptionLevel) {
      this.currentPlan = subscriptionLevel;

      if (this.currentPlan.startsWith('ANNUAL_')) {
        this.isAnnually = true;
        this.currentPlan = this.currentPlan.substring(7);
      }

      this.currentPlan = this.currentPlan.slice(0, -5).toLowerCase();
    } else {
      this.currentPlan = "free"
    }
  }

  handleAddMemberDialogOpen() {
    this.dialog.open(InviteMemberDialogComponent, {
      width: '25em',
      data: {id: this.company.id, name: this.company.name}
    });
  }

  handleDeleteMemberDialogOpen(user) {
    this.dialog.open(DeleteMemberDialogComponent, {
      width: '25em',
      data: {companyId: this.company.id, user}
    });
  }

  handleRevokeInvitationDialogOpen(userEmail: string) {
    this.dialog.open(RevokeInvitationDialogComponent, {
      width: '25em',
      data: {companyId: this.company.id, userEmail}
    });
  }

  changeCompanyName() {
    this.submittingChangedName = true;
    this._company.updateCompanyName(this.company.id, this.company.name).subscribe(
      () => {
        this.angulartics2.eventTrack.next({
          action: 'Company: company name is updated successfully',
        });
        this.submittingChangedName = false
      },
      () => this.submittingChangedName = false,
      () => this.submittingChangedName = false
    );
  }
}
