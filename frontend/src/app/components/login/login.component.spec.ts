import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Angulartics2Module } from 'angulartics2';
import { AuthService } from 'src/app/services/auth.service';
import { FormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { LoginComponent } from './login.component';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authService: AuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [
        HttpClientTestingModule,
        RouterTestingModule.withRoutes([]),
        FormsModule,
        MatSnackBarModule,
        Angulartics2Module.forRoot(),
        LoginComponent
    ]
})
    .compileComponents();

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
