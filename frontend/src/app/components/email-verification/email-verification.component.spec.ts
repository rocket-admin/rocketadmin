import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmailVerificationComponent } from './email-verification.component';
import { RouterTestingModule } from "@angular/router/testing";
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';
import { Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

describe('EmailVerificationComponent', () => {
  let component: EmailVerificationComponent;
  let fixture: ComponentFixture<EmailVerificationComponent>;
  let authService: AuthService;
  // let mockLocalStorage;
  let routerSpy;

  beforeEach(async () => {
    routerSpy = {navigate: jasmine.createSpy('navigate')};

    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule.withRoutes([]),
        MatSnackBarModule,
        EmailVerificationComponent
      ],
      providers: [
        provideHttpClient(),
        {provide: ActivatedRoute, useValue: {
          paramMap: of(convertToParamMap({
            'verification-token': '1234567890-abcd'
          })),
        }},
        { provide: Router, useValue: routerSpy },
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EmailVerificationComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should verify email', async() => {
    const fakeVerifyEmail = spyOn(authService, 'verifyEmail').and.returnValue(of());

    component.ngOnInit();

    expect(fakeVerifyEmail).toHaveBeenCalledOnceWith('1234567890-abcd');
    // expect(routerSpy.navigate).toHaveBeenCalledWith(['/user-settings']);
  });
});
