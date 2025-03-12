import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { GroupAddDialogComponent } from './group-add-dialog/group-add-dialog.component';
import { GroupDeleteDialogComponent } from './group-delete-dialog/group-delete-dialog.component';
import { PermissionsAddDialogComponent } from './permissions-add-dialog/permissions-add-dialog.component';
import { UserAddDialogComponent } from './user-add-dialog/user-add-dialog.component';
import { UserDeleteDialogComponent } from './user-delete-dialog/user-delete-dialog.component';
import { UsersComponent } from './users.component';
import { UsersService } from 'src/app/services/users.service';
import { of } from 'rxjs';
import { Angulartics2Module } from 'angulartics2';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

describe('UsersComponent', () => {
  let component: UsersComponent;
  let fixture: ComponentFixture<UsersComponent>;
  let usersService: UsersService;
  let dialog: MatDialog;
  let dialogRefSpyObj = jasmine.createSpyObj({ afterClosed : of('delete'), close: null });
  dialogRefSpyObj.componentInstance = { deleteWidget: of('user_name') };

  const fakeGroup = {
    "id": "a9a97cf1-cb2f-454b-a74e-0075dd07ad92",
    "title": "Admin",
    "isMain": true
  };

  beforeEach(async() => {
    TestBed.configureTestingModule({
      imports: [
        MatSnackBarModule,
        MatDialogModule,
        Angulartics2Module.forRoot(),
        UsersComponent
      ],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: MatDialogRef, useValue: {} },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UsersComponent);
    component = fixture.componentInstance;
    usersService = TestBed.inject(UsersService);
    dialog = TestBed.inject(MatDialog);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should permit action if access level is fullaccess', () => {
    const isPermitted = component.isPermitted('fullaccess');
    expect(isPermitted).toBeTrue();
  });

  it('should permit action if access level is edit', () => {
    const isPermitted = component.isPermitted('edit');
    expect(isPermitted).toBeTrue();
  });

  it('should not permit action if access level is none', () => {
    const isPermitted = component.isPermitted('none');
    expect(isPermitted).toBeFalse();
  });

  it('should set list of groups', () => {
    const mockGroups = [
      {
        "group": {
          "id": "77154868-eaf0-4a53-9693-0470182d0971",
          "title": "Sellers",
          "isMain": false
        },
        "accessLevel": "edit"
      },
      {
        "group": {
          "id": "a9a97cf1-cb2f-454b-a74e-0075dd07ad92",
          "title": "Admin",
          "isMain": true
        },
        "accessLevel": "edit"
      }
    ]
    component.connectionID = '12345678';

    spyOn(usersService, 'fetchConnectionGroups').and.returnValue(of(mockGroups));

    component.getUsersGroups();
    expect(component.groups).toEqual(mockGroups);
  });

  it('should open create group dialog', () => {
    const fakeCreateUsersGroupOpen = spyOn(dialog, 'open');
    event = jasmine.createSpyObj('event', [ 'preventDefault', 'stopImmediatePropagation' ]);

    component.openCreateUsersGroupDialog(event);
    expect(fakeCreateUsersGroupOpen).toHaveBeenCalledOnceWith(GroupAddDialogComponent, {
      width: '25em'
    });
  });

  it('should open permissions dialog', () => {
    // const fakePermissionsDialogOpen = spyOn(dialog, 'open');
    const fakePermissionsDialogOpen = spyOn(dialog, 'open').and.returnValue(dialogRefSpyObj);

    component.openPermissionsDialog(fakeGroup);
    expect(fakePermissionsDialogOpen).toHaveBeenCalledOnceWith(PermissionsAddDialogComponent, {
      width: '50em',
      data: fakeGroup
    });
  });

  it('should open add user dialog', () => {
    const fakeAddUserDialogOpen = spyOn(dialog, 'open');

    component.openAddUserDialog(fakeGroup);
    expect(fakeAddUserDialogOpen).toHaveBeenCalledOnceWith(UserAddDialogComponent, {
      width: '25em',
      data: { group: fakeGroup, availableMembers: []}
    });
  });

  it('should open delete group dialog', () => {
    const fakeDeleteGroupDialogOpen = spyOn(dialog, 'open');

    component.openDeleteGroupDialog(fakeGroup);
    expect(fakeDeleteGroupDialogOpen).toHaveBeenCalledOnceWith(GroupDeleteDialogComponent, {
      width: '25em',
      data: fakeGroup
    });
  });

  it('should open delete user dialog', () => {
    const fakeUser = {
      id: 'user-12345678',
      "createdAt": "2021-10-01T13:43:02.034Z",
      "gclid": null,
      "isActive": true,
      "stripeId": "cus_123456789",
      "email": "user@test.com"
    }

    const fakeDeleteUserDialogOpen = spyOn(dialog, 'open');

    component.openDeleteUserDialog(fakeUser, fakeGroup);
    expect(fakeDeleteUserDialogOpen).toHaveBeenCalledOnceWith(UserDeleteDialogComponent, {
      width: '25em',
      data: {user: fakeUser, group: fakeGroup}
    });
  });

  it('should set users list of group in users object', (done) => {
    const mockGroupUsersList = [
      {
        "id": "user-12345678",
        "createdAt": "2021-11-17T16:07:13.955Z",
        "gclid": null,
        "isActive": true,
        "stripeId": "cus_87654321",
        "email": "user1@test.com"
      },
      {
        "id": "user-87654321",
        "createdAt": "2021-10-01T13:43:02.034Z",
        "gclid": null,
        "isActive": true,
        "stripeId": "cus_12345678",
        "email": "user2@test.com"
      }
    ]

    spyOn(usersService, 'fetcGroupUsers').and.returnValue(of(mockGroupUsersList));

    component.fetchAndPopulateGroupUsers('12345678').subscribe(() => {
      expect(component.users['12345678']).toEqual(mockGroupUsersList);
      done();
    });
  });

  it('should set \'empty\' value in users object', (done) => {
    const mockGroupUsersList = []

    spyOn(usersService, 'fetcGroupUsers').and.returnValue(of(mockGroupUsersList));

    component.fetchAndPopulateGroupUsers('12345678').subscribe(() => {
      expect(component.users['12345678']).toEqual('empty');
      done();
    });
  });
});
