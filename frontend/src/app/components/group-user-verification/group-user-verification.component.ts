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

  isVerified: boolean = null;

  constructor(
    private _usersService: UsersService,
    private route: ActivatedRoute,
    public router: Router,

  ) { }

  ngOnInit(): void {
    this.route.paramMap
    .pipe(
      map((params: ParamMap) => {
        const verificationToken = params.get('verification-token');
        const expirationTime = localStorage.getItem('token_expiration');

        this._usersService.verifyGroupUserEmail(verificationToken)
          .subscribe(() => {
            if (expirationTime) {
              this.router.navigate(['/user-settings']);
            } else {
              this.router.navigate(['/login']);
            }
            this.isVerified = true;
          });
      })
    ).subscribe();
  }

}
