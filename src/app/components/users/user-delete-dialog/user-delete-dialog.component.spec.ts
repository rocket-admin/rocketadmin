import { ComponentFixture, TestBed, async, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { UserDeleteDialogComponent } from './user-delete-dialog.component';
import { UsersService } from 'src/app/services/users.service';
import { of } from 'rxjs';

describe('UserDeleteDialogComponent', () => {
  let component: UserDeleteDialogComponent;
  let fixture: ComponentFixture<UserDeleteDialogComponent>;
  let usersService: UsersService;

  const mockDialogRef = {
    close: () => { }
  };

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ UserDeleteDialogComponent ],
      imports: [HttpClientTestingModule, MatSnackBarModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: {user: {email: 'user@test.com'}, group: {id: '12345678-123'}} },
        { provide: MatDialogRef, useValue: mockDialogRef },
      ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UserDeleteDialogComponent);
    component = fixture.componentInstance;
    usersService = TestBed.inject(UsersService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call delete user service', () => {
    const fakeDeleteUser = spyOn(usersService, 'deleteGroupUser').and.returnValue(of());
    spyOn(mockDialogRef, 'close');

    component.deleteGroupUser();
    expect(fakeDeleteUser).toHaveBeenCalledOnceWith('user@test.com', '12345678-123');
    // expect(component.dialogRef.close).toHaveBeenCalled();
    expect(component.submitting).toBeFalse();
  });
});
