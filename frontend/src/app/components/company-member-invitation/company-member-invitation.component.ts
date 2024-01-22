import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { Component, OnInit } from '@angular/core';

// import { CompanyService } from 'src/app/services/company.service';
import { map } from 'rxjs/operators';
import { AuthService } from 'src/app/services/auth.service';
import { CompanyService } from 'src/app/services/company.service';
import { Angulartics2 } from 'angulartics2';

@Component({
  selector: 'app-company-member-invitation',
  templateUrl: './company-member-invitation.component.html',
  styleUrls: ['./company-member-invitation.component.css']
})
export class CompanyMemberInvitationComponent implements OnInit {

  public token: string;
  public companyName: string = null;
  public password: string = '';
  public userName: string;
  public submitting: boolean;
  public checkingLink: boolean = true;
  public isLinkAvailable: boolean = false;

  constructor(
    private _auth: AuthService,
    private _company: CompanyService,
    private router: Router,
    private route: ActivatedRoute,
    private angulartics2: Angulartics2,
  ) {}

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        map((params: ParamMap) => {
          this.token = params.get('verification-token');
          const companyId = params.get('company-id');
          this._company.fetchCompanyName(companyId).subscribe(res => this.companyName = res.name);
          this._auth.checkInvitationAvailability(this.token).subscribe(res => {
            this.isLinkAvailable = res.success;
            this.checkingLink = false;
          })
        })
      ).subscribe();
  }

  updatePasswordField(updatedValue: string) {
    this.password = updatedValue;
  }

  acceptInvitation() {
    this._auth.acceptCompanyInvitation(this.token, this.password, this.userName).subscribe(() => {
      this.angulartics2.eventTrack.next({
        action: 'Company invitation: invitation is accepted successfully',
      });
      this.router.navigate(['/connections-list'])
    })
  }

}
