import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { TestBed } from '@angular/core/testing';
import { UsersService } from './users.service';
import { NotificationsService } from './notifications.service';
import { AccessLevel } from '../models/user';

describe('UsersService', () => {
  let service: UsersService;
  let httpMock: HttpTestingController;

  let fakeNotifications;

  const groupNetwork = {
    "title": "Managers",
    "users": [
      {
        "id": "83f35e11-6499-470e-9ccb-08b6d9393943",
        "createdAt": "2021-07-21T14:35:17.270Z",
        "gclid": null,
        "isActive": true
      }
    ],
    "id": "1c042912-326d-4fc5-bb0c-10da88dd37c4",
    "isMain": false
  }

  const permissionsNetwork = {
    "connection": {
      "connectionId": "75b0574a-9fc5-4472-90e1-5c030b0b28b5",
      "accessLevel": "readonly"
    },
    "group": {
      "groupId": "1c042912-326d-4fc5-bb0c-10da88dd37c4",
      "accessLevel": "edit"
    },
    "tables": [
      {
        "tableName": "TOYS_TEST",
        "accessLevel": {
          "visibility": true,
          "readonly": true,
          "add": false,
          "delete": false,
          "edit": false
        }
      },
      {
        "tableName": "PRODUCTS_TEST",
        "accessLevel": {
          "visibility": true,
          "readonly": false,
          "add": true,
          "delete": false,
          "edit": true
        }
      }
    ]
  }

  const permissionsApp = {
    "connection": {
      "accessLevel": AccessLevel.Readonly,
      "connectionId": "75b0574a-9fc5-4472-90e1-5c030b0b28b5"
    },
    "group": {
      "accessLevel": AccessLevel.Edit,
      "groupId": "1c042912-326d-4fc5-bb0c-10da88dd37c4"
    },
    "tables": [
      {
        "accessLevel": {
          "add": false,
          "delete": false,
          "edit": false,
          "readonly": true,
          "visibility": true
        },
        "tableName": "TOYS_TEST"
      },
      {
        "accessLevel": {
          "add": true,
          "delete": false,
          "edit": true,
          "readonly": false,
          "visibility": true
        },
        "tableName": "PRODUCTS_TEST"
      }
    ]
  }

  const fakeError = {
    "message": "Connection error",
    "statusCode": 400,
    "type": "no_master_key"
  }

  beforeEach(() => {
    fakeNotifications = jasmine.createSpyObj('NotificationsService', ['showErrorSnackbar', 'showSuccessSnackbar']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, MatSnackBarModule],
      providers: [
        {
          provide: NotificationsService,
          useValue: fakeNotifications
        },
      ]
    });

    service = TestBed.get(UsersService);
    httpMock = TestBed.get(HttpTestingController);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call fetchConnectionUsers', () => {
    let isSubscribeCalled = false;
    const usersNetwork = [
      {
        "id": "83f35e11-6499-470e-9ccb-08b6d9393943",
        "isActive": true,
        "email": "lyubov+fghj@voloshko.com",
        "createdAt": "2021-07-21T14:35:17.270Z"
      }
    ];

    service.fetchConnectionUsers('12345678').subscribe(res => {
      expect(res).toEqual(usersNetwork);
      isSubscribeCalled = true;
    });

    const req = httpMock.expectOne(`${service._connectionURL}/users/12345678`);
    expect(req.request.method).toBe("GET");
    req.flush(usersNetwork);

    expect(isSubscribeCalled).toBe(true);
  });

  it('should fall fetchConnectionUsers and show Error snackbar', async () => {
    const fetchConnectionUsers = service.fetchConnectionUsers('12345678').toPromise();

    const req = httpMock.expectOne(`${service._connectionURL}/users/12345678`);
    expect(req.request.method).toBe("GET");
    req.flush(fakeError, {status: 400, statusText: ''});
    await fetchConnectionUsers;

    expect(fakeNotifications.showErrorSnackbar).toHaveBeenCalledOnceWith(fakeError.message);
  });

  it('should call fetchConnectionGroups', () => {
    let isSubscribeCalled = false;
    const groupsNetwork = [
      {
        "group": {
          "id": "014fa4ae-f56f-4084-ac24-58296641678b",
          "title": "Admin",
          "isMain": true
        },
        "accessLevel": "edit"
      }
    ];

    service.fetchConnectionGroups('12345678').subscribe(res => {
      expect(res).toEqual(groupsNetwork);
      isSubscribeCalled = true;
    });

    const req = httpMock.expectOne(`${service._connectionGroupsURL}/12345678`);
    expect(req.request.method).toBe("GET");
    req.flush(groupsNetwork);

    expect(isSubscribeCalled).toBe(true);
  });

  it('should fall fetchConnectionGroups and show Error snackbar', async () => {
    const fetchConnectionGroups = service.fetchConnectionGroups('12345678').toPromise();

    const req = httpMock.expectOne(`${service._connectionGroupsURL}/12345678`);
    expect(req.request.method).toBe("GET");
    req.flush(fakeError, {status: 400, statusText: ''});
    await fetchConnectionGroups;

    expect(fakeNotifications.showErrorSnackbar).toHaveBeenCalledOnceWith(fakeError.message);
  });

  it('should call fetcGroupUsers', () => {
    let isSubscribeCalled = false;
    const groupUsersNetwork = [
      {
        "id": "83f35e11-6499-470e-9ccb-08b6d9393943",
        "createdAt": "2021-07-21T14:35:17.270Z",
        "gclid": null,
        "isActive": true,
        "email": "lyubov+fghj@voloshko.com"
      }
    ];

    service.fetcGroupUsers('12345678').subscribe(res => {
      expect(res).toEqual(groupUsersNetwork);
      isSubscribeCalled = true;
    });

    const req = httpMock.expectOne(`${service._groupURL}/users/12345678`);
    expect(req.request.method).toBe("GET");
    req.flush(groupUsersNetwork);

    expect(isSubscribeCalled).toBe(true);
  });

  it('should fall fetchConnectionGroups and show Error snackbar', async () => {
    const fetchConnectionGroups = service.fetcGroupUsers('12345678').toPromise();

    const req = httpMock.expectOne(`${service._groupURL}/users/12345678`);
    expect(req.request.method).toBe("GET");
    req.flush(fakeError, {status: 400, statusText: ''});
    await fetchConnectionGroups;

    expect(fakeNotifications.showErrorSnackbar).toHaveBeenCalledOnceWith(fakeError.message);
  });

  it('should call createUsersGroup', () => {
    let isSubscribeCalled = false;

    service.createUsersGroup('12345678', 'Managers').subscribe(res => {
      expect(fakeNotifications.showSuccessSnackbar).toHaveBeenCalledOnceWith('Group of users has been created.');
      isSubscribeCalled = true;
    });

    const req = httpMock.expectOne(`${service._connectionGroupURL}/12345678`);
    expect(req.request.method).toBe("POST");
    expect(req.request.body).toEqual({title: 'Managers'});
    req.flush(groupNetwork);

    expect(isSubscribeCalled).toBe(true);
  });

  it('should fall createUsersGroup and show Error snackbar', async () => {
    const createUsersGroup = service.createUsersGroup('12345678', 'Managers').toPromise();

    const req = httpMock.expectOne(`${service._connectionGroupURL}/12345678`);
    expect(req.request.method).toBe("POST");
    req.flush(fakeError, {status: 400, statusText: ''});
    await createUsersGroup;

    expect(fakeNotifications.showErrorSnackbar).toHaveBeenCalledOnceWith(fakeError.message);
  });

  it('should call fetchPermission', () => {
    let isSubscribeCalled = false;

    service.fetchPermission('12345678', 'group12345678').subscribe(res => {
      expect(res).toEqual(permissionsNetwork);
      isSubscribeCalled = true;
    });

    const req = httpMock.expectOne(`${service._connectionURL}/permissions?connectionId=12345678&groupId=group12345678`);
    expect(req.request.method).toBe("GET");
    req.flush(permissionsNetwork);

    expect(isSubscribeCalled).toBe(true);
  });

  it('should fall fetchPermission and show Error snackbar', async () => {
    const fetchPermission = service.fetchPermission('12345678', 'group12345678').toPromise();

    const req = httpMock.expectOne(`${service._connectionURL}/permissions?connectionId=12345678&groupId=group12345678`);
    expect(req.request.method).toBe("GET");
    req.flush(fakeError, {status: 400, statusText: ''});
    await fetchPermission;

    expect(fakeNotifications.showErrorSnackbar).toHaveBeenCalledOnceWith(fakeError.message);
  });

  it('should call updatePermission and show Success snackbar', () => {
    let isSubscribeCalled = false;

    service.updatePermission(permissionsApp).subscribe(res => {
      expect(fakeNotifications.showSuccessSnackbar).toHaveBeenCalledOnceWith('Permissions have been updated successfully.');
      isSubscribeCalled = true;
    });

    const req = httpMock.expectOne(`${service._permissionsURL}/1c042912-326d-4fc5-bb0c-10da88dd37c4`);
    expect(req.request.method).toBe("PUT");
    expect(req.request.body).toEqual({permissions: permissionsApp});
    req.flush(permissionsNetwork);

    expect(isSubscribeCalled).toBe(true);
  });

  it('should fall updatePermission and show Error snackbar', async () => {
    const updatePermission = service.updatePermission(permissionsApp).toPromise();

    const req = httpMock.expectOne(`${service._permissionsURL}/1c042912-326d-4fc5-bb0c-10da88dd37c4`);
    expect(req.request.method).toBe("PUT");
    req.flush(fakeError, {status: 400, statusText: ''});
    await updatePermission;

    expect(fakeNotifications.showErrorSnackbar).toHaveBeenCalledOnceWith(fakeError.message);
  });

  it('should call addGroupUser and show Success snackbar', () => {
    let isSubscribeCalled = false;

    service.addGroupUser('group12345678', 'eric.cartman@south.park').subscribe(res => {
      // expect(fakeNotifications.showSuccessSnackbar).toHaveBeenCalledOnceWith('User has been added to group.');
      isSubscribeCalled = true;
    });

    const req = httpMock.expectOne(`${service._groupURL}/user`);
    expect(req.request.method).toBe("PUT");
    expect(req.request.body).toEqual({
      email: 'eric.cartman@south.park',
      groupId: 'group12345678'
    });
    req.flush(groupNetwork);

    expect(isSubscribeCalled).toBe(true);
  });

  it('should fall addGroupUser and show Error snackbar', async () => {
    const addGroupUser = service.addGroupUser('group12345678', 'eric.cartman@south.park').toPromise();

    const req = httpMock.expectOne(`${service._groupURL}/user`);
    expect(req.request.method).toBe("PUT");
    req.flush(fakeError, {status: 400, statusText: ''});
    await addGroupUser;

    expect(fakeNotifications.showErrorSnackbar).toHaveBeenCalledOnceWith(fakeError.message);
  });

  it('should call deleteUsersGroup and show Success snackbar', () => {
    let isSubscribeCalled = false;

    const deleteGroup = {
      "raw": [],
      "affected": 1
    }

    service.deleteUsersGroup('group12345678').subscribe(res => {
      expect(fakeNotifications.showSuccessSnackbar).toHaveBeenCalledOnceWith('Group has been removed.');
      isSubscribeCalled = true;
    });

    const req = httpMock.expectOne(`${service._groupURL}/group12345678`);
    expect(req.request.method).toBe("DELETE");
    req.flush(deleteGroup);

    expect(isSubscribeCalled).toBe(true);
  });

  it('should fall deleteUsersGroup and show Error snackbar', async () => {
    const deleteUsersGroup = service.deleteUsersGroup('group12345678').toPromise();

    const req = httpMock.expectOne(`${service._groupURL}/group12345678`);
    expect(req.request.method).toBe("DELETE");
    req.flush(fakeError, {status: 400, statusText: ''});
    await deleteUsersGroup;

    expect(fakeNotifications.showErrorSnackbar).toHaveBeenCalledOnceWith(fakeError.message);
  });

  it('should call deleteGroupUser and show Success snackbar', () => {
    let isSubscribeCalled = false;

    const deleteGroup = {
      "raw": [],
      "affected": 1
    }

    service.deleteGroupUser('eric.cartman@south.park', 'group12345678').subscribe(res => {
      expect(fakeNotifications.showSuccessSnackbar).toHaveBeenCalledOnceWith('User has been removed from group.');
      isSubscribeCalled = true;
    });

    const req = httpMock.expectOne(`${service._groupURL}/user/delete`);
    expect(req.request.method).toBe("PUT");
    expect(req.request.body).toEqual({
      email: 'eric.cartman@south.park',
      groupId: 'group12345678'
    });
    req.flush(deleteGroup);

    expect(isSubscribeCalled).toBe(true);
  });

  it('should fall deleteGroupUser and show Error snackbar', async () => {
    const deleteGroupUser = service.deleteGroupUser('eric.cartman@south.park', 'group12345678').toPromise();

    const req = httpMock.expectOne(`${service._groupURL}/user/delete`);
    expect(req.request.method).toBe("PUT");
    req.flush(fakeError, {status: 400, statusText: ''});
    await deleteGroupUser;

    expect(fakeNotifications.showErrorSnackbar).toHaveBeenCalledOnceWith(fakeError.message);
  });
});
