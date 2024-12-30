import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { map } from 'rxjs/operators';
import { AuthService } from 'src/app/services/auth.service';
import { CompanyService } from 'src/app/services/company.service';
import { Angulartics2 } from 'angulartics2';
import { PlaceholderCompanyInvitationComponent } from '../skeletons/placeholder-company-invitation/placeholder-company-invitation.component';
import { BannerComponent } from '../ui-components/banner/banner.component';
import { AlertComponent } from '../ui-components/alert/alert.component';
import { UserPasswordComponent } from '../ui-components/user-password/user-password.component';

@Component({
  selector: 'app-company-member-invitation',
  templateUrl: './company-member-invitation.component.html',
  styleUrls: ['./company-member-invitation.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDividerModule,
    PlaceholderCompanyInvitationComponent,
    BannerComponent,
    AlertComponent,
    UserPasswordComponent
  ]
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
