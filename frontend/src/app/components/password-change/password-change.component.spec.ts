import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PasswordChangeComponent } from './password-change.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterTestingModule } from "@angular/router/testing";
import { FormsModule }   from '@angular/forms';
import { of } from 'rxjs';
import { UserService } from 'src/app/services/user.service';
import { Router } from '@angular/router';
import { SubscriptionPlans } from 'src/app/models/user';

fdescribe('PasswordChangeComponent', () => {
  let component: PasswordChangeComponent;
  let fixture: ComponentFixture<PasswordChangeComponent>;
  let userService: UserService;
  let routerSpy;

  beforeEach(async () => {
    // routerSpy = {navigate: jasmine.createSpy('navigate')};

    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        // RouterTestingModule.withRoutes([]),
        FormsModule,
        MatSnackBarModule
      ],
      providers: [
        { provide: Router, useValue: routerSpy },
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
      subscriptionLevel: SubscriptionPlans.free
    };
    const fakeChangePassword = spyOn(userService, 'changePassword').and.returnValue(of());

    await component.updatePassword();
    expect(fakeChangePassword).toHaveBeenCalledOnceWith('hH12345678', '12345678hH', 'my@email.com');

  });
});
