import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { Component, OnInit } from '@angular/core';

import { UsersService } from 'src/app/services/users.service';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-group-user-verification',
  templateUrl: './group-user-verification.component.html',
  styleUrls: ['./group-user-verification.component.css']
})
export class GroupUserVerificationComponent implements OnInit {

  public submitting: boolean = false;
  public token: string;
  public password: string = '';

  constructor(
    private _usersService: UsersService,
    private route: ActivatedRoute,
    public router: Router,

  ) { }

  ngOnInit(): void {
    this.route.paramMap
    .pipe(
      map((params: ParamMap) => {
        this.token = params.get('verification-token');
      })
    ).subscribe();
  }

  updatePasswordField(updatedValue: string) {
    this.password = updatedValue;
  }

  verifyGroupUser() {
    this.submitting = true;

    this._usersService.verifyGroupUserEmail(this.token, this.password)
    .subscribe(() => {
      this.router.navigate(['/login']);
      this.submitting = false;
    },
    () => this.submitting = false,
    () => this.submitting = false);
  }
}


