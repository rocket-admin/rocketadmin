import { AlertActionType, AlertType } from '../models/alert';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { TestBed } from '@angular/core/testing';

import { NotificationsService } from './notifications.service';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { UserService } from './user.service';
import { provideHttpClient } from '@angular/common/http';

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;
  let fakeNotifications;
  let routerSpy;

  const authUser = {
    email: 'eric.cartman@south.park',
    password: '12345678'
  }

  const fakeError = {
    "message": "User error",
    "statusCode": 400,
    "type": "no_master_key",
    "originalMessage": "User error details"
  }

  beforeEach(() => {
    fakeNotifications = jasmine.createSpyObj('NotificationsService', ['showErrorSnackbar', 'showSuccessSnackbar', 'showAlert']);
    routerSpy = {navigate: jasmine.createSpy('navigate')};

    TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,
        MatSnackBarModule
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        UserService,
        {
          provide: NotificationsService,
          useValue: fakeNotifications
        },
        { provide: Router, useValue: routerSpy },
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
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

    const req = httpMock.expectOne(`/user`);
    expect(req.request.method).toBe("GET");
    req.flush(user);

    expect(isSubscribeCalled).toBe(true);
  });

  it('should fall fetchUser and show Error snackbar', async () => {
    const fetchUser = service.fetchUser().toPromise();

    const req = httpMock.expectOne(`/user`);
    expect(req.request.method).toBe("GET");
    req.flush(fakeError, {status: 400, statusText: ''});
    await fetchUser;

    expect(fakeNotifications.showErrorSnackbar).toHaveBeenCalledOnceWith(fakeError.message);
  });

  it('should call requestEmailChange', () => {
    let isEmailChangeRequestedCalled = false;

    const requestResponse = {
      message: "Email change request was requested successfully"
    }

    service.requestEmailChange().subscribe((res) => {
      expect(res).toEqual(requestResponse);
      expect(fakeNotifications.showAlert).toHaveBeenCalledWith(AlertType.Info, 'Link has been sent to your email. Please check it.', [jasmine.objectContaining({
        type: AlertActionType.Button,
        caption: 'Dismiss',
      })]);
      isEmailChangeRequestedCalled = true;
    });

    const req = httpMock.expectOne(`/user/email/change/request`);
    expect(req.request.method).toBe("GET");
    req.flush(requestResponse);

    expect(isEmailChangeRequestedCalled).toBeTrue();
  });

  it('should fall for requestEmailChange and show Error alert', async () => {
    const resMessage = service.requestEmailChange().toPromise();

    const req = httpMock.expectOne(`/user/email/change/request`);
    expect(req.request.method).toBe("GET");
    req.flush(fakeError, {status: 400, statusText: ''});
    await resMessage;

    expect(fakeNotifications.showAlert).toHaveBeenCalledWith(AlertType.Error, { abstract: fakeError.message, details: fakeError.originalMessage }, [jasmine.objectContaining({
      type: AlertActionType.Button,
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

    const req = httpMock.expectOne(`/user/email/change/verify/123456789`);
    expect(req.request.method).toBe("POST");
    expect(req.request.body).toEqual({email: 'new-new@email.com'});
    req.flush(requestResponse);

    expect(isEmailChangedCalled).toBeTrue();
  });

  it('should fall for changeEmail and show Error alert', async () => {
    const resMessage = service.changeEmail('123456789', 'new-new@email.com').toPromise();

    const req = httpMock.expectOne(`/user/email/change/verify/123456789`);
    expect(req.request.method).toBe("POST");
    req.flush(fakeError, {status: 400, statusText: ''});
    await resMessage;

    expect(fakeNotifications.showAlert).toHaveBeenCalledWith(AlertType.Error, { abstract: fakeError.message, details: fakeError.originalMessage }, [jasmine.objectContaining({
      type: AlertActionType.Button,
      caption: 'Dismiss',
    })]);
  });

  it('should call requestPasswordReset and show Success alert', () => {
    let isPasswordChangeRequestedCalled = false;

    const requestResponse = {
      message: "Password change request was requested successfully"
    }

    service.requestPasswordReset('john@smith.com', 'company_1').subscribe((res) => {
      expect(res).toEqual(requestResponse);
      expect(fakeNotifications.showAlert).toHaveBeenCalledWith(AlertType.Success, 'Check your email.', [jasmine.objectContaining({
        type: AlertActionType.Button,
        caption: 'Dismiss',
      })]);
      isPasswordChangeRequestedCalled = true;
    });

    const req = httpMock.expectOne(`/user/password/reset/request`);
    expect(req.request.method).toBe("POST");
    req.flush(requestResponse);

    expect(isPasswordChangeRequestedCalled).toBeTrue();
  });

  it('should fall for requestPasswordReset and show Error alert', async () => {
    const resMessage = service.requestPasswordReset('john@smith.com', 'company_1').toPromise();

    const req = httpMock.expectOne(`/user/password/reset/request`);
    expect(req.request.method).toBe("POST");
    req.flush(fakeError, {status: 400, statusText: ''});
    await resMessage;

    expect(fakeNotifications.showAlert).toHaveBeenCalledWith(AlertType.Error, { abstract: fakeError.message, details: fakeError.originalMessage }, [jasmine.objectContaining({
      type: AlertActionType.Button,
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

    const req = httpMock.expectOne(`/user/password/reset/verify/123456789`);
    expect(req.request.method).toBe("POST");
    expect(req.request.body).toEqual({password: 'newpassword123'});
    req.flush(requestResponse);

    expect(isPasswordChangedCalled).toBeTrue();
  });

  it('should fall for resetPassword and show Error alert', async () => {
    const resMessage = service.resetPassword('123456789', 'newpassword123').toPromise();

    const req = httpMock.expectOne(`/user/password/reset/verify/123456789`);
    expect(req.request.method).toBe("POST");
    req.flush(fakeError, {status: 400, statusText: ''});
    await resMessage;

    expect(fakeNotifications.showAlert).toHaveBeenCalledWith(AlertType.Error, { abstract: fakeError.message, details: fakeError.originalMessage }, [jasmine.objectContaining({
      type: AlertActionType.Button,
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

    const req = httpMock.expectOne(`/user/password/change/`);
    expect(req.request.method).toBe("POST");
    expect(req.request.body).toEqual({
      email: 'john@smith.com',
      oldPassword: 'old-password',
      newPassword: 'new-password'
    });
    req.flush(requestResponse);

    expect(isPasswordChangedCalled).toBeTrue();
  });

  it('should fall for changePassword and show Error alert', async () => {
    const resMessage = service.changePassword('old-password', 'new-password', 'john@smith.com').toPromise();

    const req = httpMock.expectOne(`/user/password/change/`);
    expect(req.request.method).toBe("POST");
    req.flush(fakeError, {status: 400, statusText: ''});
    await resMessage;

    expect(fakeNotifications.showAlert).toHaveBeenCalledWith(AlertType.Error, { abstract: fakeError.message, details: fakeError.originalMessage }, [jasmine.objectContaining({
      type: AlertActionType.Button,
      caption: 'Dismiss',
    })]);
  });

  it('should call changeUserName', () => {
    let isChangeUserNameCalled = false;

    const requestResponse = {}

    service.changeUserName('Eric').subscribe((res) => {
      expect(res).toEqual(requestResponse);
      expect(fakeNotifications.showSuccessSnackbar).toHaveBeenCalledOnceWith('Your name has been changed successfully.');
      isChangeUserNameCalled = true;
    });

    const req = httpMock.expectOne(`/user/name`);
    expect(req.request.method).toBe("PUT");
    expect(req.request.body).toEqual({
      name: 'Eric'
    });
    req.flush(requestResponse);

    expect(isChangeUserNameCalled).toBeTrue();
  });

  it('should fall for changeUserName and show Error alert', async () => {
    const resMessage = service.changeUserName('Eric').toPromise();

    const req = httpMock.expectOne(`/user/name`);
    expect(req.request.method).toBe("PUT");
    req.flush(fakeError, {status: 400, statusText: ''});
    await resMessage;

    expect(fakeNotifications.showErrorSnackbar).toHaveBeenCalledWith(fakeError.message);
  });

  it('should call switchOn2FA', () => {
    let isSwitchOn2FACalled = false;

    const requestResponse = {}

    service.switchOn2FA().subscribe((res) => {
      expect(res).toEqual(requestResponse);
      isSwitchOn2FACalled = true;
    });

    const req = httpMock.expectOne(`/user/otp/generate`);
    expect(req.request.method).toBe("POST");
    expect(req.request.body).toEqual({});
    req.flush(requestResponse);

    expect(isSwitchOn2FACalled).toBeTrue();
  });

  it('should fall for switchOn2FA and show Error alert', async () => {
    const resMessage = service.switchOn2FA().toPromise();

    const req = httpMock.expectOne(`/user/otp/generate`);
    expect(req.request.method).toBe("POST");
    req.flush(fakeError, {status: 400, statusText: ''});
    await resMessage;

    expect(fakeNotifications.showErrorSnackbar).toHaveBeenCalledWith(fakeError.message);
  });

  it('should call confirm2FA', () => {
    let isConfirm2FACalled = false;

    const requestResponse = {}

    service.confirm2FA('123456').subscribe((res) => {
      expect(res).toEqual(requestResponse);
      expect(fakeNotifications.showSuccessSnackbar).toHaveBeenCalledOnceWith('2FA is turned on successfully.');
      isConfirm2FACalled = true;
    });

    const req = httpMock.expectOne(`/user/otp/verify`);
    expect(req.request.method).toBe("POST");
    expect(req.request.body).toEqual({otpToken: '123456'});
    req.flush(requestResponse);

    expect(isConfirm2FACalled).toBeTrue();
  });

  xit('should fall for confirm2FA and show Error alert', async () => {
    const resMessage = service.confirm2FA('123456').toPromise();

    const req = httpMock.expectOne(`/user/otp/verify`);
    expect(req.request.method).toBe("POST");
    expect(req.request.body).toEqual({otpToken: '123456'});
    req.flush(fakeError, {status: 400, statusText: ''});
    await resMessage;

    expect(fakeNotifications.showErrorSnackbar).toHaveBeenCalledWith(fakeError.message);
  });

  it('should call switchOff2FA', () => {
    let isSwitchOff2FACalled = false;

    const requestResponse = {}

    service.switchOff2FA('123456').subscribe((res) => {
      expect(res).toEqual(requestResponse);
      expect(fakeNotifications.showSuccessSnackbar).toHaveBeenCalledOnceWith('2FA is turned off successfully.');
      isSwitchOff2FACalled = true;
    });

    const req = httpMock.expectOne(`/user/otp/disable`);
    expect(req.request.method).toBe("POST");
    expect(req.request.body).toEqual({otpToken: '123456'});
    req.flush(requestResponse);

    expect(isSwitchOff2FACalled).toBeTrue();
  });

  it('should fall for switchOff2FA and show Error alert', async () => {
    const resMessage = service.switchOff2FA('123456').toPromise();

    const req = httpMock.expectOne(`/user/otp/disable`);
    expect(req.request.method).toBe("POST");
    expect(req.request.body).toEqual({otpToken: '123456'});
    req.flush(fakeError, {status: 400, statusText: ''});
    await resMessage;

    expect(fakeNotifications.showErrorSnackbar).toHaveBeenCalledWith(fakeError.message);
  });

  it('should call deleteAccount', () => {
    let isDeleteuserCalled = false;
    const metadata = {
      reason: 'missing-features',
      message: 'i want to add tables'
    }
    const requestResponse = true;

    service.deleteAccount(metadata).subscribe((res) => {
      // expect(fakeNotifications.showSuccessSnackbar).toHaveBeenCalledOnceWith('You account has been deleted.');
      isDeleteuserCalled = true;
    });

    const req = httpMock.expectOne(`/user/delete`);
    expect(req.request.method).toBe("PUT");
    req.flush(requestResponse);

    expect(isDeleteuserCalled).toBeTrue();
    expect(routerSpy.navigate).toHaveBeenCalledOnceWith(['/deleted']);
  });

  it('should fall for deleteAccount and show Error alert', async () => {
    const metadata = {
      reason: 'missing-features',
      message: 'i want to add tables'
    }

    const resMessage = service.deleteAccount(metadata).toPromise();

    const req = httpMock.expectOne(`/user/delete`);
    expect(req.request.method).toBe("PUT");
    req.flush(fakeError, {status: 400, statusText: ''});
    await resMessage;

    expect(fakeNotifications.showAlert).toHaveBeenCalledWith(AlertType.Error, { abstract: fakeError.message, details: fakeError.originalMessage }, [jasmine.objectContaining({
      type: AlertActionType.Button,
      caption: 'Dismiss',
    })]);
  });
});
