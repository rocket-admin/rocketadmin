import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SocialAuthService, SocialLoginModule } from '@abacritt/angularx-social-login';

import { Angulartics2Module } from 'angulartics2';
import { AuthService } from 'src/app/services/auth.service';
import { FormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { RegistrationComponent } from './registration.component';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

describe('RegistrationComponent', () => {
  let component: RegistrationComponent;
  let fixture: ComponentFixture<RegistrationComponent>;
  let authService: AuthService;
  let socialAuthService: SocialAuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        RouterTestingModule.withRoutes([]),
        FormsModule,
        MatSnackBarModule,
        Angulartics2Module.forRoot(),
        SocialLoginModule
      ],
      providers: [
        { provide: 'SocialAuthServiceConfig', useValue: {
          autoLogin: false,
          providers: []
        } }
      ],
      declarations: [ RegistrationComponent ]
    })
    .compileComponents();

    // @ts-ignore
    global.window.gtag = jasmine.createSpy();

    // @ts-ignore
    global.window.google = jasmine.createSpy();
    // @ts-ignore
    // global.window.customerly = {open: jasmine.createSpy()};
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RegistrationComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    socialAuthService = TestBed.inject(SocialAuthService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should sign a user in', () => {
    component.user = {
      email: 'john@smith.com',
      password: 'kK123456789'
    }

    const fakeSignUpUser = spyOn(authService, 'signUpUser').and.returnValue(of());

    component.registerUser();
    expect(fakeSignUpUser).toHaveBeenCalledOnceWith({
      email: 'john@smith.com',
      password: 'kK123456789'
    });
    expect(component.submitting).toBeFalse();
  });

  it('should login a user with FB', () => {
    const fakeLoginFB = spyOn(socialAuthService, 'signIn');

    component.loginWithFacebook();
    expect(fakeLoginFB).toHaveBeenCalled();
  });
});
