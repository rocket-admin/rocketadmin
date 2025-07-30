import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Angulartics2Module } from 'angulartics2';
import { AuthService } from 'src/app/services/auth.service';
import { FormsModule } from '@angular/forms';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { RegistrationComponent } from './registration.component';
import { of } from 'rxjs';
import { IPasswordStrengthMeterService } from '@eresearchqut/angular-password-strength-meter';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

describe('RegistrationComponent', () => {
  let component: RegistrationComponent;
  let fixture: ComponentFixture<RegistrationComponent>;
  let authService: AuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        MatSnackBarModule,
        Angulartics2Module.forRoot(),
        BrowserAnimationsModule,
        RegistrationComponent
      ],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: IPasswordStrengthMeterService, useValue: {} }
      ]
    }).compileComponents();

    // @ts-ignore
    global.window.gtag = jasmine.createSpy();

    // @ts-ignore
    global.window.google  = jasmine.createSpyObj(['accounts']);
    // @ts-ignore
    global.window.google.accounts = jasmine.createSpyObj(['id']);
    // @ts-ignore
    global.window.google.accounts.id = jasmine.createSpyObj(['initialize', 'renderButton', 'prompt']);
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RegistrationComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
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
});
