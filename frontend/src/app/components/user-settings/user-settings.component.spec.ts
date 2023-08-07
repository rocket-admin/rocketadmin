import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { AccountDeleteDialogComponent } from './account-delete-dialog/account-delete-dialog.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterTestingModule } from '@angular/router/testing';
import { SubscriptionPlans } from 'src/app/models/user';
import { UserService } from 'src/app/services/user.service';
import { UserSettingsComponent } from './user-settings.component';
import { forwardRef } from '@angular/core';
import { of } from 'rxjs';

describe('UserSettingsComponent', () => {
  let component: UserSettingsComponent;
  let fixture: ComponentFixture<UserSettingsComponent>;
  let userService: UserService;
  let dialog: MatDialog;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        RouterTestingModule,
        FormsModule,
        MatInputModule,
        MatSlideToggleModule,
        MatDialogModule,
        MatSnackBarModule,
        BrowserAnimationsModule
      ],
      declarations: [ UserSettingsComponent ],
      providers: [
        {
          provide: NG_VALUE_ACCESSOR,
          useExisting: forwardRef(() => UserSettingsComponent),
          multi: true
        },
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UserSettingsComponent);
    component = fixture.componentInstance;
    userService = TestBed.inject(UserService);
    dialog = TestBed.get(MatDialog);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should request email change', () => {
    const fakeRequestEmailChange = spyOn(userService, 'requestEmailChange').and.returnValue(of({message: 'requested'}));

    component.changeEmail();
    expect(fakeRequestEmailChange).toHaveBeenCalled();
  });

  it('should open delete account dialog', () => {
    const fakeDeleteAccountOpen = spyOn(dialog, 'open');
    component.currentUser = {
      id: 'user-12345678',
      "createdAt": "2021-10-01T13:43:02.034Z",
      "isActive": true,
      "email": "user@test.com",
      "portal_link": "stripe.link",
      "subscriptionLevel": SubscriptionPlans.free,
      "is_2fa_enabled": false
    }

    component.confirmDeleteAccount();
    expect(fakeDeleteAccountOpen).toHaveBeenCalledOnceWith(AccountDeleteDialogComponent, {
      width: '32em',
      data: {
        id: 'user-12345678',
        "createdAt": "2021-10-01T13:43:02.034Z",
        "isActive": true,
        "email": "user@test.com",
        "portal_link": "stripe.link",
        "subscriptionLevel": SubscriptionPlans.free,
        "is_2fa_enabled": false
      }
    });
  });
});
