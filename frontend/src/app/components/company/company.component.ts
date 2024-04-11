import { InviteMemberDialogComponent } from './invite-member-dialog/invite-member-dialog.component';
import { Company, CompanyMemberRole } from 'src/app/models/company';
import { CompanyService } from 'src/app/services/company.service';
import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { SubscriptionPlans } from 'src/app/models/user';
import { UserService } from 'src/app/services/user.service';
import { orderBy } from "lodash";
import { DeleteMemberDialogComponent } from './delete-member-dialog/delete-member-dialog.component';
import { RevokeInvitationDialogComponent } from './revoke-invitation-dialog/revoke-invitation-dialog.component';
import { Angulartics2 } from 'angulartics2';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-company',
  templateUrl: './company.component.html',
  styleUrls: ['./company.component.css']
})
export class CompanyComponent {

  public isSaas = (environment as any).saas;
  public company: Company = null;
  public members: any = null;
  public currentPlan: string;
  public submitting: boolean;
  public usersCount: number;
  public adminsCount: number;
  public suspendedAdminsCount: number;
  public membersTableDisplayedColumns: string[];
  // public invitationsTableDisplayColumns: string[] = ['invitedUserEmail', 'role'];
  public submittingChangedName: boolean =false;
  public currentUser;
  public submittingUsersChange: boolean = false;

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
      if (arg === 'invited' || arg === 'revoked' || arg === 'role' || arg === 'suspended' || arg === 'unsuspended') {
        this.submittingUsersChange = true;
        this._company.fetchCompany().subscribe(res => {
          this.company = res;
          this.getCompanyMembers(res.id);
          this.submittingUsersChange = false;
        });
      }
      else if (arg === 'deleted') {
        this.submittingUsersChange = true;
        this.getCompanyMembers(this.company.id);
      };
    });
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

          if (this.currentUser.role === 'ADMIN') {
            this.membersTableDisplayedColumns = ['email', 'name', 'role', 'twoFA', 'active', 'actions'];
          } else {
            this.membersTableDisplayedColumns = ['email', 'name', 'role', 'twoFA'];
          }

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
      this.suspendedAdminsCount = res.filter(user => user.role === 'ADMIN' && user.suspended).length;
      this.usersCount = this.company.invitations.length + res.length;
      this.submittingUsersChange = false;
    });
  }

  setCompanyPlan(subscriptionLevel: SubscriptionPlans) {
    if (subscriptionLevel) {
      this.currentPlan = subscriptionLevel;

      if (this.currentPlan.startsWith('ANNUAL_')) {
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

  updateRole(userId: string, userRole: CompanyMemberRole) {
    this.submittingUsersChange = true;
    this._company.updateCompanyMemberRole(this.company.id, userId, userRole).subscribe(() => {
      this.getCompanyMembers(this.company.id);
    });
  }

  switchSuspendance(value: boolean, memberEmail: string) {
    console.log(value, memberEmail);
    this.submittingUsersChange = true;
    if (value) {
      this._company.restoreCompanyMember(this.company.id, [memberEmail]).subscribe(() => {
        this.angulartics2.eventTrack.next({
          action: 'Company: member is restored',
        });
      });
    } else {
      this._company.suspendCompanyMember(this.company.id, [memberEmail]).subscribe(() => {
        this.angulartics2.eventTrack.next({
          action: 'Company: member is suspended',
        });
      });
    }
  }
}
