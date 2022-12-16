import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { UserSettingsComponent } from './user-settings.component';
import { of } from 'rxjs';
import { UserService } from 'src/app/services/user.service';
import { AccountDeleteDialogComponent } from './account-delete-dialog/account-delete-dialog.component';
import { SubscriptionPlans } from 'src/app/models/user';
import { RouterTestingModule } from '@angular/router/testing';

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
        MatDialogModule,
        MatSnackBarModule
      ],
      declarations: [ UserSettingsComponent ]
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
      "subscriptionLevel": SubscriptionPlans.free
    }

    component.confirmDeleteAccount();
    expect(fakeDeleteAccountOpen).toHaveBeenCalledOnceWith(AccountDeleteDialogComponent, {
      data: {
        id: 'user-12345678',
        "createdAt": "2021-10-01T13:43:02.034Z",
        "isActive": true,
        "email": "user@test.com",
        "portal_link": "stripe.link",
        "subscriptionLevel": SubscriptionPlans.free
      },
      width: '32em'
    });
  });
});
