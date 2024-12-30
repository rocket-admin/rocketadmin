import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { User } from '@sentry/angular-ivy';
import { UserService } from 'src/app/services/user.service';

@Component({
  selector: 'app-zapier',
  templateUrl: './zapier.component.html',
  styleUrl: './zapier.component.css',
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ZapierComponent implements OnInit {
  public currentUser: User;

  constructor(
    private _userService: UserService
  ) {}

  ngOnInit(): void {
    this._userService.cast.subscribe(user => this.currentUser = user);
  }
}
