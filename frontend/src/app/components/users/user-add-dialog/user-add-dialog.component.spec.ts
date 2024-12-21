import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { FormsModule }   from '@angular/forms';
import { UserAddDialogComponent } from './user-add-dialog.component';
import { of } from 'rxjs';
import { UsersService } from 'src/app/services/users.service';
import { Angulartics2Module } from 'angulartics2';

describe('UserAddDialogComponent', () => {
  let component: UserAddDialogComponent;
  let fixture: ComponentFixture<UserAddDialogComponent>;
  let usersService: UsersService;

  const mockDialogRef = {
    close: () => { }
  };

  beforeEach(async() => {
    TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        MatSnackBarModule,
        FormsModule,
        Angulartics2Module.forRoot(),
        UserAddDialogComponent
      ],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { id: '12345678-123' } },
        { provide: MatDialogRef, useValue: mockDialogRef }
      ],
  })
    .compileComponents();
  });

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
