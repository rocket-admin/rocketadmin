import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { Component, OnInit } from '@angular/core';

// import { CompanyService } from 'src/app/services/company.service';
import { map } from 'rxjs/operators';
import { AuthService } from 'src/app/services/auth.service';
import { CompanyService } from 'src/app/services/company.service';

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

  constructor(
    private _auth: AuthService,
    private _company: CompanyService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        map((params: ParamMap) => {
          this.token = params.get('verification-token');
          const companyId = params.get('company-id');
          this._company.fetchCompanyName(companyId).subscribe(res => this.companyName = res.name);
        })
      ).subscribe();
  }

  updatePasswordField(updatedValue: string) {
    this.password = updatedValue;
  }

  acceptInvitation() {
    this._auth.acceptCompanyInvitation(this.token, this.password, this.userName).subscribe(() => {
      this.router.navigate(['/connections-list'])
    })
  }

}
