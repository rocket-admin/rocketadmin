import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { GroupDeleteDialogComponent } from './group-delete-dialog.component';
import { UsersService } from 'src/app/services/users.service';
import { of } from 'rxjs';
import { Angulartics2Module } from 'angulartics2';
import { provideHttpClient } from '@angular/common/http';

describe('GroupDeleteDialogComponent', () => {
  let component: GroupDeleteDialogComponent;
  let fixture: ComponentFixture<GroupDeleteDialogComponent>;
  let usersService: UsersService;

  const mockDialogRef = {
    close: () => { }
  };

  beforeEach(async() => {
    TestBed.configureTestingModule({
      imports: [
        MatSnackBarModule,
        Angulartics2Module.forRoot(),
        GroupDeleteDialogComponent
      ],
      providers: [
        provideHttpClient(),
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: MatDialogRef, useValue: mockDialogRef },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GroupDeleteDialogComponent);
    component = fixture.componentInstance;
    usersService = TestBed.inject(UsersService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call delete user group service', () => {
    const fakeDeleteUsersGroup = spyOn(usersService, 'deleteUsersGroup').and.returnValue(of());
    spyOn(mockDialogRef, 'close');

    component.deleteUsersGroup('12345678-123');
    expect(fakeDeleteUsersGroup).toHaveBeenCalledOnceWith('12345678-123');
    // expect(component.dialogRef.close).toHaveBeenCalled();
    expect(component.submitting).toBeFalse();
  });
});
