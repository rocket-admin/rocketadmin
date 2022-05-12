import { Component, OnInit } from '@angular/core';
import { UserService } from 'src/app/services/user.service';
import { map } from 'rxjs/operators';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';

@Component({
  selector: 'app-email-change',
  templateUrl: './email-change.component.html',
  styleUrls: ['./email-change.component.css']
})
export class EmailChangeComponent implements OnInit {

  public token: string;
  public newEmail: string;
  public submitting: boolean;

  constructor(
    private _userService: UserService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.route.paramMap
    .pipe(
      map((params: ParamMap) => {
        this.token = params.get('change-token');
      })
    ).subscribe();
  }

  updateEmail() {
    this.submitting = true;
    this._userService.changeEmail(this.token, this.newEmail)
      .subscribe(() => {
        this._userService.fetchUser().subscribe(() => this.router.navigate(['/user-settings']))
      },
      () => this.submitting = false,
      () => this.submitting = false);
  }
}
