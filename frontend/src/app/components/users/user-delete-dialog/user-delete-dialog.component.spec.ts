import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { UserDeleteDialogComponent } from './user-delete-dialog.component';
import { UsersService } from 'src/app/services/users.service';
import { of } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';

describe('UserDeleteDialogComponent', () => {
  let component: UserDeleteDialogComponent;
  let fixture: ComponentFixture<UserDeleteDialogComponent>;
  let usersService: UsersService;

  const mockDialogRef = {
    close: () => { }
  };

  beforeEach(async() => {
    await TestBed.configureTestingModule({
      imports: [MatSnackBarModule, UserDeleteDialogComponent],
      providers: [
        provideHttpClient(),
        { provide: MAT_DIALOG_DATA, useValue: { user: { email: 'user@test.com' }, group: { id: '12345678-123' } } },
        { provide: MatDialogRef, useValue: mockDialogRef },
      ]
    }).compileComponents();
  });

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
