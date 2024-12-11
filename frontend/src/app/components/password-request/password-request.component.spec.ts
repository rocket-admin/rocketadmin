import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PasswordRequestComponent } from './password-request.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule }   from '@angular/forms';
import { UserService } from 'src/app/services/user.service';
import { of } from 'rxjs';
import { RouterTestingModule } from '@angular/router/testing';

describe('PasswordRequestComponent', () => {
  let component: PasswordRequestComponent;
  let fixture: ComponentFixture<PasswordRequestComponent>;
  let userService: UserService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        RouterTestingModule,
        FormsModule,
        MatSnackBarModule
      ],
      declarations: [ PasswordRequestComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PasswordRequestComponent);
    component = fixture.componentInstance;
    userService = TestBed.inject(UserService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should create', () => {
    component.userEmail = "eric@cartman.ass";
    component.companyId = "company_1111"
    const fakePasswordReset = spyOn(userService, 'requestPasswordReset').and.returnValue(of());

    component.requestPassword();

    expect(fakePasswordReset).toHaveBeenCalledOnceWith("eric@cartman.ass", "company_1111");
  });
});
