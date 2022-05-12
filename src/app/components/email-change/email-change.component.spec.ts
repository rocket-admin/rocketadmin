import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from "@angular/router/testing";
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { EmailChangeComponent } from './email-change.component';
import { FormsModule }   from '@angular/forms';
import { UserService } from 'src/app/services/user.service';
import { of } from 'rxjs';

describe('EmailChangeComponent', () => {
  let component: EmailChangeComponent;
  let fixture: ComponentFixture<EmailChangeComponent>;
  let userService: UserService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule.withRoutes([]),
        HttpClientTestingModule,
        MatSnackBarModule,
        FormsModule
      ],
      declarations: [ EmailChangeComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EmailChangeComponent);
    component = fixture.componentInstance;
    userService = TestBed.inject(UserService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should update email', () => {
    component.token = '12345678';
    component.newEmail = 'new@email.com'
    const fakeUpdateEmail = spyOn(userService, 'changeEmail').and.returnValue(of());

    component.updateEmail();
    expect(fakeUpdateEmail).toHaveBeenCalledOnceWith('12345678', 'new@email.com');
  });
});