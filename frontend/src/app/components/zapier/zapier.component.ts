import { CUSTOM_ELEMENTS_SCHEMA, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { User } from '@sentry/angular-ivy';
import { UserService } from 'src/app/services/user.service';

@Component({
  selector: 'app-zapier',
  imports: [
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './zapier.component.html',
  styleUrl: './zapier.component.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ZapierComponent {
  public currentUser: User;

  constructor(
    private _userService: UserService
  ) {}

  ngOnInit(): void {
    this._userService.cast.subscribe(user => this.currentUser = user);
  }
}
