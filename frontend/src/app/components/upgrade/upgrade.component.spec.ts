import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { UpgradeComponent } from './upgrade.component';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { UserService } from 'src/app/services/user.service';
import { of } from 'rxjs';
import { RouterTestingModule } from '@angular/router/testing';

describe('UpgradeComponent', () => {
  let component: UpgradeComponent;
  let fixture: ComponentFixture<UpgradeComponent>;
  let userService: UserService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        RouterTestingModule,
        MatSnackBarModule
      ],
      declarations: [ UpgradeComponent ],
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UpgradeComponent);
    component = fixture.componentInstance;
    userService = TestBed.get(UserService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // it('should define ANNUAL_ENTERPRISE_PLAN as annuale enterprise plan', () => {
  //   const fakeUser = {
  //     "id": "12345678",
  //     "isActive": true,
  //     "email": "test.user@email.com",
  //     "createdAt": "2021-11-17T16:07:13.955Z",
  //     "portal_link": "https://billing.stripe.com/session/live_YWNjdF8xSk04RkJGdEhkZGExVHNCLF9LdHlWbVdQYWFZTWRHSWFST2xUUmZVZ1E0UVFoMjBX0100erRIau3Y",
  //     "subscriptionLevel": "ANNUAL_ENTERPRISE_PLAN"
  //   }

  //   component.setUser(fakeUser);

  //   expect(component.isAnnually).toBeTrue();
  //   expect(component.currentPlan).toEqual('enterprise');
  // });

  // it('should define TEAM_PLAN as not annuale team plan', () => {
  //   const fakeUser = {
  //     "id": "12345678",
  //     "isActive": true,
  //     "email": "test.user@email.com",
  //     "createdAt": "2021-11-17T16:07:13.955Z",
  //     "portal_link": "https://billing.stripe.com/session/live_YWNjdF8xSk04RkJGdEhkZGExVHNCLF9LdHlWbVdQYWFZTWRHSWFST2xUUmZVZ1E0UVFoMjBX0100erRIau3Y",
  //     "subscriptionLevel": "TEAM_PLAN"
  //   }

  //   component.setUser(fakeUser);

  //   expect(component.isAnnually).toBeFalse();
  //   expect(component.currentPlan).toEqual('team');
  // });

  // it('should call upgrage plan service for monthly team plan', () => {
  //   const fakeUpgradeUser = spyOn(userService, 'upgradeUser').and.returnValue(of(''));
  //   const fakeFetchUser = spyOn(userService, 'fetchUser').and.returnValue(of(''));

  //   component.upgradePlan('team', false);
  //   expect(fakeUpgradeUser).toHaveBeenCalledOnceWith('TEAM_PLAN');
  //   expect(fakeFetchUser).toHaveBeenCalled();
  // });

  // it('should call upgrage plan service and add ANNUAL_ if subscription is annual', () => {
  //   const fakeUpgradeUser = spyOn(userService, 'upgradeUser').and.returnValue(of(''));
  //   const fakeFetchUser = spyOn(userService, 'fetchUser').and.returnValue(of(''));

  //   component.upgradePlan('team', true);
  //   expect(fakeUpgradeUser).toHaveBeenCalledOnceWith('ANNUAL_TEAM_PLAN');
  //   expect(fakeFetchUser).toHaveBeenCalled();
  // });
});
