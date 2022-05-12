import { BannerActionType, BannerType } from '../models/banner';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TestBed, async } from '@angular/core/testing';

import { NotificationsService } from './notifications.service';
import { UserService } from './user.service';
import { of } from 'rxjs';

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;
  let fakeNotifications;

  const authUser = {
    email: 'eric.cartman@south.park',
    password: '12345678'
  }

  const fakeError = {
    "message": "Connection error",
    "statusCode": 400,
    "type": "no_master_key"
  }

  beforeEach(() => {
    fakeNotifications = jasmine.createSpyObj('NotificationsService', ['showErrorSnackbar', 'showSuccessSnackbar', 'showBanner']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, MatSnackBarModule],
      providers: [
        UserService,
        {
          provide: NotificationsService,
          useValue: fakeNotifications
        }
      ]
    });

    httpMock = TestBed.get(HttpTestingController);
    service = TestBed.inject(UserService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call fetchUser', () => {
    const user = {
      "id": "97cbc96d-7cbc-4c8d-b8b8-36322509106d",
      "isActive": true,
      "email": "lyubov+9999@voloshko.com",
      "createdAt": "2021-01-20T11:17:44.138Z",
      "portal_link": "https://billing.stripe.com/session/live_YWNjdF8xSk04RkJGdEhkZGExVHNCLF9LdHlWbVdQYWFZTWRHSWFST2xUUmZVZ1E0UVFoMjBX0100erRIau3Y",
      "subscriptionLevel": "ANNUAL_ENTERPRISE_PLAN"
    }
    let isSubscribeCalled = false;

    service.fetchUser().subscribe(res => {
      expect(res).toEqual(user);
      isSubscribeCalled = true;
    });

    const req = httpMock.expectOne(`${service._userURLv2}`);
    expect(req.request.method).toBe("GET");
    req.flush(user);

    expect(isSubscribeCalled).toBe(true);
  });

  it('should fall fetchUser and show Error snackbar', async () => {
    const fetchUser = service.fetchUser().toPromise();

    const req = httpMock.expectOne(`${service._userURLv2}`);
    expect(req.request.method).toBe("GET");
    req.flush(fakeError, {status: 400, statusText: ''});
    await fetchUser;

    expect(fakeNotifications.showErrorSnackbar).toHaveBeenCalledOnceWith(fakeError.message);
  });

  it('should call upgradeUser', () => {
    const user = {
      "id": "97cbc96d-7cbc-4c8d-b8b8-36322509106d",
      "isActive": true,
      "email": "lyubov+9999@voloshko.com",
      "createdAt": "2021-01-20T11:17:44.138Z",
      "portal_link": "https://billing.stripe.com/session/live_YWNjdF8xSk04RkJGdEhkZGExVHNCLF9LdHlWbVdQYWFZTWRHSWFST2xUUmZVZ1E0UVFoMjBX0100erRIau3Y",
      "subscriptionLevel": "ANNUAL_ENTERPRISE_PLAN"
    }
    let isSubscribeCalled = false;

    service.upgradeUser('ANNUAL_ENTERPRISE_PLAN').subscribe(res => {
      expect(res).toEqual(user);
      isSubscribeCalled = true;
    });

    const req = httpMock.expectOne(`${service._userURLv2}/subscription/upgrade`);
    expect(req.request.method).toBe("POST");
    expect(req.request.body).toEqual({subscriptionLevel: 'ANNUAL_ENTERPRISE_PLAN'});
    req.flush(user);

    expect(isSubscribeCalled).toBe(true);
  });

  it('should fall upgradeUser and show Error banner', async () => {
    const upgradeUser = service.upgradeUser('ANNUAL_ENTERPRISE_PLAN').toPromise();

    const req = httpMock.expectOne(`${service._userURLv2}/subscription/upgrade`);
    expect(req.request.method).toBe("POST");
    req.flush(fakeError, {status: 400, statusText: ''});
    await upgradeUser;

    expect(fakeNotifications.showBanner).toHaveBeenCalledWith(BannerType.Error, fakeError.message, [
      jasmine.objectContaining({
        type: BannerActionType.Link,
        caption: 'Settings',
        to: '/user-settings'
      }),
      jasmine.objectContaining({
        type: BannerActionType.Button,
        caption: 'Dismiss',
      }),
    ]);
  });

  it('should call requestEmailChange', () => {
    let isEmailChangeRequestedCalled = false;

    const requestResponse = {
      message: "Email change request was requested successfully"
    }

    service.requestEmailChange().subscribe((res) => {
      expect(res).toEqual(requestResponse);
      expect(fakeNotifications.showBanner).toHaveBeenCalledWith(BannerType.Info, 'Link has been sent to your email. Please check it.', [jasmine.objectContaining({
        type: BannerActionType.Button,
        caption: 'Dismiss',
      })]);
      isEmailChangeRequestedCalled = true;
    });

    const req = httpMock.expectOne(`${service._userURLv2}/email/change/request`);
    expect(req.request.method).toBe("GET");
    req.flush(requestResponse);

    expect(isEmailChangeRequestedCalled).toBeTrue();
  });

  it('should fall for requestEmailChange and show Error banner', async () => {
    const resMessage = service.requestEmailChange().toPromise();

    const req = httpMock.expectOne(`${service._userURLv2}/email/change/request`);
    expect(req.request.method).toBe("GET");
    req.flush(fakeError, {status: 400, statusText: ''});
    await resMessage;

    expect(fakeNotifications.showBanner).toHaveBeenCalledWith(BannerType.Error, fakeError.message, [jasmine.objectContaining({
      type: BannerActionType.Button,
      caption: 'Dismiss',
    })]);
  });

  it('should call changeEmail', () => {
    let isEmailChangedCalled = false;

    const requestResponse = {
      message: "Email was changed successfully"
    }

    service.changeEmail('123456789', 'new-new@email.com').subscribe((res) => {
      expect(res).toEqual(requestResponse);
      expect(fakeNotifications.showSuccessSnackbar).toHaveBeenCalledOnceWith('You email has been changed successfully.');
      isEmailChangedCalled = true;
    });

    const req = httpMock.expectOne(`${service._userURLv2}/email/change/verify/123456789`);
    expect(req.request.method).toBe("POST");
    expect(req.request.body).toEqual({email: 'new-new@email.com'});
    req.flush(requestResponse);

    expect(isEmailChangedCalled).toBeTrue();
  });

  it('should fall for changeEmail and show Error banner', async () => {
    const resMessage = service.changeEmail('123456789', 'new-new@email.com').toPromise();

    const req = httpMock.expectOne(`${service._userURLv2}/email/change/verify/123456789`);
    expect(req.request.method).toBe("POST");
    req.flush(fakeError, {status: 400, statusText: ''});
    await resMessage;

    expect(fakeNotifications.showBanner).toHaveBeenCalledWith(BannerType.Error, fakeError.message, [jasmine.objectContaining({
      type: BannerActionType.Button,
      caption: 'Dismiss',
    })]);
  });

  it('should call requestPasswordReset and show Success banner', () => {
    let isPasswordChangeRequestedCalled = false;

    const requestResponse = {
      message: "Password change request was requested successfully"
    }

    service.requestPasswordReset('john@smith.com').subscribe((res) => {
      expect(res).toEqual(requestResponse);
      expect(fakeNotifications.showBanner).toHaveBeenCalledWith(BannerType.Success, 'Check your email.', [jasmine.objectContaining({
        type: BannerActionType.Button,
        caption: 'Dismiss',
      })]);
      isPasswordChangeRequestedCalled = true;
    });

    const req = httpMock.expectOne(`${service._userURLv2}/password/reset/request`);
    expect(req.request.method).toBe("POST");
    req.flush(requestResponse);

    expect(isPasswordChangeRequestedCalled).toBeTrue();
  });

  it('should fall for requestPasswordReset and show Error banner', async () => {
    const resMessage = service.requestPasswordReset('john@smith.com').toPromise();

    const req = httpMock.expectOne(`${service._userURLv2}/password/reset/request`);
    expect(req.request.method).toBe("POST");
    req.flush(fakeError, {status: 400, statusText: ''});
    await resMessage;

    expect(fakeNotifications.showBanner).toHaveBeenCalledWith(BannerType.Error, fakeError.message, [jasmine.objectContaining({
      type: BannerActionType.Button,
      caption: 'Dismiss',
    })]);
  });

  it('should call resetPassword', () => {
    let isPasswordChangedCalled = false;

    const requestResponse = {
      message: "Password was changed successfully"
    }

    service.resetPassword('123456789', 'newpassword123').subscribe((res) => {
      expect(res).toEqual(requestResponse);
      expect(fakeNotifications.showSuccessSnackbar).toHaveBeenCalledOnceWith('Your password has been reset successfully.');
      isPasswordChangedCalled = true;
    });

    const req = httpMock.expectOne(`${service._userURLv2}/password/reset/verify/123456789`);
    expect(req.request.method).toBe("POST");
    expect(req.request.body).toEqual({password: 'newpassword123'});
    req.flush(requestResponse);

    expect(isPasswordChangedCalled).toBeTrue();
  });

  it('should fall for resetPassword and show Error banner', async () => {
    const resMessage = service.resetPassword('123456789', 'newpassword123').toPromise();

    const req = httpMock.expectOne(`${service._userURLv2}/password/reset/verify/123456789`);
    expect(req.request.method).toBe("POST");
    req.flush(fakeError, {status: 400, statusText: ''});
    await resMessage;

    expect(fakeNotifications.showBanner).toHaveBeenCalledWith(BannerType.Error, fakeError.message, [jasmine.objectContaining({
      type: BannerActionType.Button,
      caption: 'Dismiss',
    })]);
  });

  it('should call changePassword', () => {
    let isPasswordChangedCalled = false;

    const requestResponse = {
      message: "Password was changed successfully"
    }

    service.changePassword('old-password', 'new-password', 'john@smith.com').subscribe((res) => {
      expect(res).toEqual(requestResponse);
      expect(fakeNotifications.showSuccessSnackbar).toHaveBeenCalledOnceWith('Your password has been changed successfully.');
      isPasswordChangedCalled = true;
    });

    const req = httpMock.expectOne(`${service._userURLv2}/password/change/`);
    expect(req.request.method).toBe("POST");
    expect(req.request.body).toEqual({
      email: 'john@smith.com',
      oldPassword: 'old-password',
      newPassword: 'new-password'
    });
    req.flush(requestResponse);

    expect(isPasswordChangedCalled).toBeTrue();
  });

  it('should fall for changePassword and show Error banner', async () => {
    const resMessage = service.changePassword('old-password', 'new-password', 'john@smith.com').toPromise();

    const req = httpMock.expectOne(`${service._userURLv2}/password/change/`);
    expect(req.request.method).toBe("POST");
    req.flush(fakeError, {status: 400, statusText: ''});
    await resMessage;

    expect(fakeNotifications.showBanner).toHaveBeenCalledWith(BannerType.Error, fakeError.message, [jasmine.objectContaining({
      type: BannerActionType.Button,
      caption: 'Dismiss',
    })]);
  });

  it('should call deleteAccount', () => {
    let isDeleteuserCalled = false;

    const requestResponse = true;

    service.deleteAccount().subscribe((res) => {
      expect(fakeNotifications.showSuccessSnackbar).toHaveBeenCalledOnceWith('You account has been deleted.');
      isDeleteuserCalled = true;
    });

    const req = httpMock.expectOne(`${service._userURLv2}`);
    expect(req.request.method).toBe("DELETE");
    req.flush(requestResponse);

    expect(isDeleteuserCalled).toBeTrue();
  });

  it('should fall for deleteAccount and show Error banner', async () => {
    const resMessage = service.deleteAccount().toPromise();

    const req = httpMock.expectOne(`${service._userURLv2}`);
    expect(req.request.method).toBe("DELETE");
    req.flush(fakeError, {status: 400, statusText: ''});
    await resMessage;

    expect(fakeNotifications.showBanner).toHaveBeenCalledWith(BannerType.Error, fakeError.message, [jasmine.objectContaining({
      type: BannerActionType.Button,
      caption: 'Dismiss',
    })]);
  });
});
