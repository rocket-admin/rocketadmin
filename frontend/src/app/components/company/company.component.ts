import { InviteMemberDialogComponent } from './invite-member-dialog/invite-member-dialog.component';
import { Company } from 'src/app/models/company';
import { CompanyService } from 'src/app/services/company.service';
import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { SubscriptionPlans } from 'src/app/models/user';

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
  public userCount: number;
  public membersTableDisplayedColumns: string[] = ['email', 'name', 'role', 'twoFA', 'actions'];
  // public invitationsTableDisplayColumns: string[] = ['invitedUserEmail', 'role'];
  public companyName: string;
  public submittingChangedName: boolean =false;

  constructor(
    private _company: CompanyService,
    // private _notifications: NotificationsService,
    // public _user: UserService,
    // private ngZone: NgZone,
    // public router: Router,
    public dialog: MatDialog,
    // private angulartics2: Angulartics2,
    // private title: Title
  ) { }

  ngOnInit() {
    this._company.fetchCompany().subscribe(res => {
      this.company = res;
      this.companyName = res.name;

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
      this.company.invitations.map( (invitee: any) =>  {
        invitee.email = invitee.invitedUserEmail;
        invitee.pending = true;
      });
      this.members = [...res, ...this.company.invitations];
      this.userCount = this.company.invitations.length + res.length;
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
    this.submitting = false;
  }

  deleteCompanyMember(user) {
    this._company.removeCompanyMemder(this.company.id, user.email, user.name).subscribe();
  }

  revokeInvitation(email: string) {
    this._company.revokeInvitation(this.company.id, email).subscribe();
  }

  changeCompanyName() {
    this.submittingChangedName = true;
  }
}
