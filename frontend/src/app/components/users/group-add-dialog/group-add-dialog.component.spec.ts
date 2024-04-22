import { ComponentFixture, TestBed, async } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule, MatDialog } from '@angular/material/dialog';

import { FormsModule }   from '@angular/forms';
import { GroupAddDialogComponent } from './group-add-dialog.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterTestingModule } from "@angular/router/testing";
import { UsersService } from 'src/app/services/users.service';
import { of } from 'rxjs';
import { Angulartics2Module } from 'angulartics2';

describe('GroupAddDialogComponent', () => {
  let component: GroupAddDialogComponent;
  let fixture: ComponentFixture<GroupAddDialogComponent>;
  let usersService: UsersService;

  const mockDialogRef = {
    close: () => { }
  };

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GroupAddDialogComponent ],
      imports: [
        HttpClientTestingModule,
        RouterTestingModule.withRoutes([]),
        MatSnackBarModule,
        FormsModule,
        MatDialogModule,
        Angulartics2Module.forRoot({})
      ],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: MatDialogRef, useValue: mockDialogRef },
      ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GroupAddDialogComponent);
    component = fixture.componentInstance;
    usersService = TestBed.inject(UsersService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call create user group service', () => {
    component.groupTitle = 'Sellers';
    component.connectionID = '12345678';
    const fakeCreateUsersGroup = spyOn(usersService, 'createUsersGroup').and.returnValue(of());
    spyOn(mockDialogRef, 'close');

    component.addGroup();

    expect(fakeCreateUsersGroup).toHaveBeenCalledOnceWith('12345678', 'Sellers');
    // expect(component.dialogRef.close).toHaveBeenCalled();
    expect(component.submitting).toBeFalse();
  });
});
