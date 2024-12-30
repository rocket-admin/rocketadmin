import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AlertActionType, AlertType } from '../models/alert';

import { AuthService } from './auth.service';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NotificationsService } from './notifications.service';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  let fakeNotifications;

  const fakeError = {
    "message": "Auth error",
    "statusCode": 400,
    "originalMessage": "Auth error details"
  }

  beforeEach(() => {
    fakeNotifications = jasmine.createSpyObj('NotificationsService', ['showErrorSnackbar', 'showSuccessSnackbar', 'showAlert']);

    TestBed.configureTestingModule({
      imports: [
        MatSnackBarModule
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AuthService,
        {
          provide: NotificationsService,
          useValue: fakeNotifications
        }
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    service = TestBed.inject(AuthService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call signUpUser', () => {
    let isSignUpUserCalled = false;

    const userData = {
      email: 'john@smith.com',
      password: 'mM87654321'
    };

    const signUpResponse = {
      expires: "2022-04-11T15:56:51.599Z"
    }

    // @ts-ignore
    global.window.fbq = jasmine.createSpy();

    service.signUpUser(userData).subscribe((res) => {
      expect(res).toEqual(signUpResponse);
      isSignUpUserCalled = true;
    });

    const req = httpMock.expectOne('https://saas.rocketadmin.com/saas/user/register');
    expect(req.request.method).toBe("POST");
    expect(req.request.body).toEqual(userData);
    req.flush(signUpResponse);

    expect(isSignUpUserCalled).toBeTrue();
  });

  it('should fall for signUpUser and show Error alert', async () => {
    const userData = {
      email: 'john@smith.com',
      password: 'mM87654321'
    };

    const tokenExpiration = service.signUpUser(userData).toPromise();

    const req = httpMock.expectOne('https://saas.rocketadmin.com/saas/user/register');
    expect(req.request.method).toBe("POST");
    req.flush(fakeError, {status: 400, statusText: ''});
    await tokenExpiration;

    expect(fakeNotifications.showAlert).toHaveBeenCalledWith(AlertType.Error, { abstract: fakeError.message, details: fakeError.originalMessage }, [jasmine.objectContaining({
      type: AlertActionType.Button,
      caption: 'Dismiss',
    })]);
  });

  it('should call loginUser', () => {
    let isSignUpUserCalled = false;

    const userData = {
      email: 'john@smith.com',
      password: 'mM87654321',
      companyId: 'company_1'
    };

    const loginResponse = {
      expires: "2022-04-11T15:56:51.599Z"
    }

    service.loginUser(userData).subscribe((res) => {
      expect(res).toEqual(loginResponse);
      isSignUpUserCalled = true;
    });

    const req = httpMock.expectOne(`/user/login`);
    expect(req.request.method).toBe("POST");
    expect(req.request.body).toEqual(userData);
    req.flush(loginResponse);

    expect(isSignUpUserCalled).toBeTrue();
  });

  it('should fall for loginUser and show Error alert', async () => {
    const userData = {
      email: 'john@smith.com',
      password: 'mM87654321',
      companyId: 'company_1'
    };

    const tokenExpiration = service.loginUser(userData).toPromise();

    const req = httpMock.expectOne(`/user/login`);
    expect(req.request.method).toBe("POST");
    req.flush(fakeError, {status: 400, statusText: ''});
    await tokenExpiration;

    expect(fakeNotifications.showAlert).toHaveBeenCalledWith(AlertType.Error, { abstract: fakeError.message, details: fakeError.originalMessage }, [jasmine.objectContaining({
      type: AlertActionType.Button,
      caption: 'Dismiss',
    })]);
  });

  it('should call loginWith2FA', () => {
    let isLoginWith2FACalled = false;

    const twofaResponse = {}

    service.loginWith2FA('123456').subscribe((res) => {
      expect(res).toEqual(twofaResponse);
      isLoginWith2FACalled = true;
    });

    const req = httpMock.expectOne(`/user/otp/login`);
    expect(req.request.method).toBe("POST");
    expect(req.request.body).toEqual({ otpToken: '123456'});
    req.flush(twofaResponse);

    expect(isLoginWith2FACalled).toBeTrue();
  });

  it('should fall for loginWith2FA and show Error alert', async () => {
    const twofaResponse = service.loginWith2FA('123456').toPromise();

    const req = httpMock.expectOne(`/user/otp/login`);
    expect(req.request.method).toBe("POST");
    expect(req.request.body).toEqual({ otpToken: '123456'});
    req.flush(fakeError, {status: 400, statusText: ''});
    await twofaResponse;

    expect(fakeNotifications.showAlert).toHaveBeenCalledWith(AlertType.Error, { abstract: fakeError.message, details: fakeError.originalMessage }, [jasmine.objectContaining({
      type: AlertActionType.Button,
      caption: 'Dismiss',
    })]);
  });

  it('should call loginWithGoogle', () => {
    let isLoginWithGoogleCalled = false;

    const googleResponse = {}

    service.loginWithGoogle('google-token-12345678').subscribe((res) => {
      expect(res).toEqual(googleResponse);
      isLoginWithGoogleCalled = true;
    });

    const req = httpMock.expectOne(`https://saas.rocketadmin.com/saas/user/google/login`);
    expect(req.request.method).toBe("POST");
    expect(req.request.body).toEqual({ token: 'google-token-12345678'});
    req.flush(googleResponse);

    expect(isLoginWithGoogleCalled).toBeTrue();
  });

  it('should fall for loginWithGoogle and show Error alert', async () => {
    const googleResponse = service.loginWithGoogle('google-token-12345678').toPromise();

    const req = httpMock.expectOne(`https://saas.rocketadmin.com/saas/user/google/login`);
    expect(req.request.method).toBe("POST");
    expect(req.request.body).toEqual({ token: 'google-token-12345678'});
    req.flush(fakeError, {status: 400, statusText: ''});
    await googleResponse;

    expect(fakeNotifications.showAlert).toHaveBeenCalledWith(AlertType.Error, { abstract: fakeError.message, details: fakeError.originalMessage }, [jasmine.objectContaining({
      type: AlertActionType.Button,
      caption: 'Dismiss',
    })]);
  });

  it('should call requestEmailVerifications', () => {
    let isRequestEmailVerificationsCalled = false;

    const googleResponse = {}

    service.requestEmailVerifications().subscribe((res) => {
      expect(res).toEqual(googleResponse);
      isRequestEmailVerificationsCalled = true;
    });

    const req = httpMock.expectOne(`/user/email/verify/request`);
    expect(req.request.method).toBe("GET");
    req.flush(googleResponse);

    expect(isRequestEmailVerificationsCalled).toBeTrue();
  });

  it('should fall for requestEmailVerifications and show Error alert', async () => {
    const googleResponse = service.requestEmailVerifications().toPromise();

    const req = httpMock.expectOne(`/user/email/verify/request`);
    expect(req.request.method).toBe("GET");
    req.flush(fakeError, {status: 400, statusText: ''});
    await googleResponse;

    expect(fakeNotifications.showAlert).toHaveBeenCalledWith(AlertType.Error, { abstract: fakeError.message, details: fakeError.originalMessage }, [jasmine.objectContaining({
      type: AlertActionType.Button,
      caption: 'Dismiss',
    })]);
  });

  it('should call verifyEmail', () => {
    let isSignUpUserCalled = false;

    const verifyResponse = {
      message:	"Email verified successfully"
    }

    service.verifyEmail('12345678').subscribe((res) => {
      expect(res).toEqual(verifyResponse);
      isSignUpUserCalled = true;
    });

    const req = httpMock.expectOne(`/user/email/verify/12345678`);
    expect(req.request.method).toBe("GET");
    req.flush(verifyResponse);

    expect(isSignUpUserCalled).toBeTrue();
  });

  it('should fall for verifyEmail and show Error alert', async () => {
    const verifyResponse = service.verifyEmail('12345678').toPromise();

    const req = httpMock.expectOne(`/user/email/verify/12345678`);
    expect(req.request.method).toBe("GET");
    req.flush(fakeError, {status: 400, statusText: ''});
    await verifyResponse;

    expect(fakeNotifications.showAlert).toHaveBeenCalledWith(AlertType.Error, { abstract: fakeError.message, details: fakeError.originalMessage }, [jasmine.objectContaining({
      type: AlertActionType.Button,
      caption: 'Dismiss',
    })]);
  });

  it('should call logOutUser', () => {
    let isLogoutCalled = false;

    const logoutResponse = true

    service.logOutUser().subscribe(() => {
      isLogoutCalled = true;
    });

    const req = httpMock.expectOne(`/user/logout`);
    expect(req.request.method).toBe("POST");
    req.flush(logoutResponse);

    expect(isLogoutCalled).toBeTrue();
  });

  it('should fall for logOutUser and show Error snackbar', async () => {
    const logoutResponse = service.logOutUser().toPromise();

    const req = httpMock.expectOne(`/user/logout`);
    expect(req.request.method).toBe("POST");
    req.flush(fakeError, {status: 400, statusText: ''});
    await logoutResponse;

    expect(fakeNotifications.showErrorSnackbar).toHaveBeenCalledWith(fakeError.message);
  });
});
