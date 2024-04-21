import { Angulartics2, Angulartics2Module } from 'angulartics2';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormsModule }   from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { PasswordChangeComponent } from './password-change.component';
import { Router } from '@angular/router';
import { RouterTestingModule } from "@angular/router/testing";
import { SubscriptionPlans } from 'src/app/models/user';
import { UserService } from 'src/app/services/user.service';
import { of } from 'rxjs';
import { CompanyMemberRole } from 'src/app/models/company';

describe('PasswordChangeComponent', () => {
  let component: PasswordChangeComponent;
  let fixture: ComponentFixture<PasswordChangeComponent>;
  let userService: UserService;
  let routerSpy;

  beforeEach(async () => {
    // routerSpy = {navigate: jasmine.createSpy('navigate')};
    const angulartics2Mock = {
      eventTrack: {
        next: () => {} // Mocking the next method
      },
      trackLocation: () => {} // Mocking the trackLocation method
    };

    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        // RouterTestingModule.withRoutes([]),
        FormsModule,
        MatSnackBarModule,
        Angulartics2Module.forRoot()
      ],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: Angulartics2, useValue: angulartics2Mock }
      ],
      declarations: [ PasswordChangeComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PasswordChangeComponent);
    component = fixture.componentInstance;
    userService = TestBed.inject(UserService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  xit('should change password', async (done) => {
    component.oldPassword = 'hH12345678';
    component.newPassword = '12345678hH';
    component.currentUser = {
      id: '9127389214',
      email: 'my@email.com',
      isActive: true,
      portal_link: 'http://lsdkjfl.dhj',
      subscriptionLevel: SubscriptionPlans.free,
      "is_2fa_enabled": false,
      role: CompanyMemberRole.Member,
      externalRegistrationProvider: null

    };
    const fakeChangePassword = spyOn(userService, 'changePassword').and.returnValue(of());

    await component.updatePassword();
    expect(fakeChangePassword).toHaveBeenCalledOnceWith('hH12345678', '12345678hH', 'my@email.com');

  });
});
