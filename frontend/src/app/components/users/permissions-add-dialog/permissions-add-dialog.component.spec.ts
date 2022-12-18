import { ComponentFixture, TestBed, async } from '@angular/core/testing';
import { FormsModule, NG_VALUE_ACCESSOR }   from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatRadioModule } from '@angular/material/radio';

import { PermissionsAddDialogComponent } from './permissions-add-dialog.component';
import { RouterTestingModule } from '@angular/router/testing';
import { forwardRef } from '@angular/core';
import { UsersService } from 'src/app/services/users.service';
import { of } from 'rxjs';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { AccessLevel } from 'src/app/models/user';

describe('PermissionsAddDialogComponent', () => {
  let component: PermissionsAddDialogComponent;
  let fixture: ComponentFixture<PermissionsAddDialogComponent>;
  let usersService: UsersService;

  const mockDialogRef = {
    close: () => { }
  };

  const fakeCustomersPermissions = {
    "tableName": "Customers",
    "accessLevel": {
      "visibility": true,
      "readonly": false,
      "add": true,
      "delete": false,
      "edit": true
    }
  }

  const fakeOrdersPermissions = {
    "tableName": "Orders",
    "accessLevel": {
      "visibility": false,
      "readonly": false,
      "add": false,
      "delete": false,
      "edit": false
    }
  }

  const fakeTablePermissions = [
    fakeCustomersPermissions,
    fakeOrdersPermissions
  ];

  const fakePermissions = {
    "connection": {
      "connectionId": "5e1092f8-4e50-4e6c-bad9-bd0b04d1af2a",
      "accessLevel": "readonly"
    },
    "group": {
      "groupId": "77154868-eaf0-4a53-9693-0470182d0971",
      "accessLevel": "edit"
    },
    "tables": fakeTablePermissions
  }

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PermissionsAddDialogComponent ],
      imports: [
        HttpClientTestingModule,
        MatSnackBarModule,
        FormsModule,
        MatRadioModule,
        MatSlideToggleModule,
        MatCheckboxModule,
        RouterTestingModule.withRoutes([]),
        MatDialogModule
      ],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: MatDialogRef, useValue: mockDialogRef },
        {
          provide: NG_VALUE_ACCESSOR,
          useExisting: forwardRef(() => PermissionsAddDialogComponent),
          multi: true
        }
      ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PermissionsAddDialogComponent);
    component = fixture.componentInstance;
    usersService = TestBed.inject(UsersService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set initial state of permissions', () => {
    spyOn(usersService, 'fetchPermission').and.returnValue(of(fakePermissions));

    component.ngOnInit();
    fixture.detectChanges();

    expect(component.connectionAccess).toEqual('readonly');
    expect(component.groupAccess).toEqual('edit');
    expect(component.tablesAccess).toEqual(fakeTablePermissions);
  });

  it('should uncheck actions if table is readonly', () => {
    component.tablesAccess = fakeTablePermissions;

    component.uncheckActions(fakeCustomersPermissions);

    expect(component.tablesAccess[0].accessLevel.readonly).toBeFalse();
    expect(component.tablesAccess[0].accessLevel.add).toBeFalse();
    expect(component.tablesAccess[0].accessLevel.delete).toBeFalse();
    expect(component.tablesAccess[0].accessLevel.edit).toBeFalse();
  });

  it('should uncheck actions if table is invisible', () => {
    component.tablesAccess = fakeTablePermissions;

    component.uncheckActions(fakeOrdersPermissions);

    expect(component.tablesAccess[1].accessLevel.readonly).toBeFalse();
    expect(component.tablesAccess[1].accessLevel.add).toBeFalse();
    expect(component.tablesAccess[1].accessLevel.delete).toBeFalse();
    expect(component.tablesAccess[1].accessLevel.edit).toBeFalse();
  });

  it('should select all tables', () => {
    component.tablesAccess = fakeTablePermissions;

    component.grantFullTableAccess();

    expect(component.tablesAccess).toEqual([
      {
        "tableName": "Customers",
        "accessLevel": {
          "visibility": true,
          "readonly": false,
          "add": true,
          "delete": true,
          "edit": true
        }
      },
      {
        "tableName": "Orders",
        "accessLevel": {
          "visibility": true,
          "readonly": false,
          "add": true,
          "delete": true,
          "edit": true
        }
      }
    ])
  });

  it('should deselect all tables', () => {
    component.tablesAccess = fakeTablePermissions;

    component.deselectAllTables();

    expect(component.tablesAccess).toEqual([
      {
        "tableName": "Customers",
        "accessLevel": {
          "visibility": false,
          "readonly": false,
          "add": false,
          "delete": false,
          "edit": false
        }
      },
      {
        "tableName": "Orders",
        "accessLevel": {
          "visibility": false,
          "readonly": false,
          "add": false,
          "delete": false,
          "edit": false
        }
      }
    ])
  });

  it('should call add permissions service', () => {
    component.connectionID = '12345678';
    component.connectionAccess = AccessLevel.Readonly;
    component.group.id = "12345678-123";
    component.groupAccess = AccessLevel.Edit;
    component.tablesAccess = fakeTablePermissions;

    const fakseUpdatePermission = spyOn(usersService, 'updatePermission').and.returnValue(of());
    spyOn(mockDialogRef, 'close');

    component.addPermissions();

    expect(fakseUpdatePermission).toHaveBeenCalledOnceWith({
      connection: {
        connectionId: '12345678',
        accessLevel: AccessLevel.Readonly
      },
      group: {
        groupId: '12345678-123',
        accessLevel: AccessLevel.Edit
      },
      tables: fakeTablePermissions
    });
    // expect(component.dialogRef.close).toHaveBeenCalled();
    expect(component.submitting).toBeFalse();
  })
});
