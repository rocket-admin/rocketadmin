import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { Component, OnInit } from '@angular/core';

import { AlertComponent } from '../ui-components/alert/alert.component';
import { CommonModule } from '@angular/common';
import { EmailValidationDirective } from 'src/app/directives/emailValidator.directive';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { UserService } from 'src/app/services/user.service';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-email-change',
  templateUrl: './email-change.component.html',
  styleUrls: ['./email-change.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    EmailValidationDirective,
    AlertComponent
  ]
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
