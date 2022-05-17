import { ComponentFixture, TestBed, async } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { FormsModule }   from '@angular/forms';
import { UserAddDialogComponent } from './user-add-dialog.component';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { UsersService } from 'src/app/services/users.service';

describe('UserAddDialogComponent', () => {
  let component: UserAddDialogComponent;
  let fixture: ComponentFixture<UserAddDialogComponent>;
  let usersService: UsersService;

  const mockDialogRef = {
    close: () => { }
  };

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ UserAddDialogComponent ],
      imports: [
        HttpClientTestingModule,
        MatSnackBarModule,
        FormsModule
      ],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: {id: '12345678-123'} },
        { provide: MatDialogRef, useValue: mockDialogRef }
      ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UserAddDialogComponent);
    component = fixture.componentInstance;
    usersService = TestBed.inject(UsersService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call add user service', () => {
    component.groupUserEmail = 'user@test.com';
    const fakeAddUser = spyOn(usersService, 'addGroupUser').and.returnValue(of());
    // spyOn(mockDialogRef, 'close');

    component.joinGroupUser();
    expect(fakeAddUser).toHaveBeenCalledOnceWith('12345678-123', 'user@test.com');

    // fixture.detectChanges();
    // fixture.whenStable().then(() => {
    //   expect(component.dialogRef.close).toHaveBeenCalled();
    //   expect(component.submitting).toBeFalse();
    // });
  });
});
