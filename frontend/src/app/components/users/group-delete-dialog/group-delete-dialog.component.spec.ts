import { ComponentFixture, TestBed, async } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { GroupDeleteDialogComponent } from './group-delete-dialog.component';
import { UsersService } from 'src/app/services/users.service';
import { of } from 'rxjs';
import { Angulartics2Module } from 'angulartics2';

describe('GroupDeleteDialogComponent', () => {
  let component: GroupDeleteDialogComponent;
  let fixture: ComponentFixture<GroupDeleteDialogComponent>;
  let usersService: UsersService;

  const mockDialogRef = {
    close: () => { }
  };

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GroupDeleteDialogComponent ],
      imports: [
        HttpClientTestingModule,
        MatSnackBarModule,
        Angulartics2Module.forRoot()
      ],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: MatDialogRef, useValue: mockDialogRef },
      ],
    })
    .compileComponents();
  }));

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
