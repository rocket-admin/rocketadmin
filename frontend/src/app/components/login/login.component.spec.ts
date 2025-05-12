import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Angulartics2Module } from 'angulartics2';
import { AuthService } from 'src/app/services/auth.service';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CompanyService } from 'src/app/services/company.service';
import { FormsModule } from '@angular/forms';
import { LoginComponent } from './login.component';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authService: AuthService;
  let companyService: CompanyService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [
      FormsModule,
      MatSnackBarModule,
      Angulartics2Module.forRoot(),
      LoginComponent,
      BrowserAnimationsModule
    ],
    providers: [provideHttpClient(), provideRouter([])]
  }).compileComponents();

    // @ts-ignore
    global.window.google  = jasmine.createSpyObj(['accounts']);
    // @ts-ignore
    global.window.google.accounts = jasmine.createSpyObj(['id']);
    // @ts-ignore
    global.window.google.accounts.id = jasmine.createSpyObj(['initialize', 'renderButton', 'prompt']);
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    companyService = TestBed.inject(CompanyService);
    spyOn(companyService, 'isCustomDomain').and.returnValue(false);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should login a user', () => {
    component.user = {
      email: 'john@smith.com',
      password: 'kK123456789',
      companyId: 'company_1'
    }

    const fakeLoginUser = spyOn(authService, 'loginUser').and.returnValue(of());

    component.loginUser();
    expect(fakeLoginUser).toHaveBeenCalledOnceWith({
      email: 'john@smith.com',
      password: 'kK123456789',
      companyId: 'company_1'
    });
    expect(component.submitting).toBeFalse();
  });
});
