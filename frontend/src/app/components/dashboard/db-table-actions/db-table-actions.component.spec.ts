import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { ActionDeleteDialogComponent } from './action-delete-dialog/action-delete-dialog.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CustomActionType } from 'src/app/models/table';
import { DbTableActionsComponent } from './db-table-actions.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NotificationsService } from 'src/app/services/notifications.service';
import { RouterTestingModule } from '@angular/router/testing';
import { TablesService } from 'src/app/services/tables.service';
import { of } from 'rxjs';
import { Angulartics2Module } from 'angulartics2';

describe('DbTableActionsComponent', () => {
  let component: DbTableActionsComponent;
  let fixture: ComponentFixture<DbTableActionsComponent>;
  let tablesService: TablesService;
  let dialog: MatDialog;
  let fakeNotifications;


  beforeEach(async () => {
    fakeNotifications = jasmine.createSpyObj('NotificationsService', ['showSuccessSnackbar']);

    await TestBed.configureTestingModule({
      declarations: [ DbTableActionsComponent ],
      providers: [
        HttpClientTestingModule,
        {
          provide: NotificationsService,
          useValue: fakeNotifications
        }
      ],
      imports: [
        HttpClientTestingModule,
        RouterTestingModule,
        MatDialogModule,
        MatSnackBarModule,
        BrowserAnimationsModule,
        Angulartics2Module.forRoot()
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DbTableActionsComponent);
    tablesService = TestBed.inject(TablesService);
    dialog = TestBed.get(MatDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set selected action', () => {
    const action = {
      id: 'action_12345678',
      title: 'action 1',
      type: CustomActionType.Single,
      url: 'https://google.com',
      tableName: 'user',
      icon: 'heart',
      requireConfirmation: false
    }
    component.setSelectedAction(action)
    expect(component.selectedAction).toEqual(action);
    expect(component.updatedActionTitle).toEqual('action 1');
  });

  it('should switch between actions on actions list click', () => {
    const action = {
      id: 'action_12345678',
      title: 'action 1',
      type: CustomActionType.Single,
      url: 'https://google.com',
      tableName: 'user',
      icon: 'heart',
      requireConfirmation: false
    }
    const mockSetSelectedAction = spyOn(component, 'setSelectedAction');

    component.switchActionView(action)

    expect(mockSetSelectedAction).toHaveBeenCalledOnceWith(action)
  });

  it('should set the new action', () => {
    component.addNewAction()

    expect(component.newAction).toEqual({
      id: '',
      title: '',
      type: CustomActionType.Single,
      url: '',
      tableName: '',
      icon: '',
      requireConfirmation: false
    })
  });

  it('should set an error if user try to add action with empty name to the list', () => {
    component.newAction = {
      id: '',
      title: '',
      type: CustomActionType.Single,
      url: '',
      tableName: '',
      icon: '',
      requireConfirmation: false
    }
    component.handleAddNewAction()

    expect(component.actionNameError).toEqual('The name cannot be empty.');
  });

  it('should set an error if user try to add action with the same name to the list', () => {
    component.actions = [{
      id: 'action_12345678',
      title: 'action 1',
      type: CustomActionType.Single,
      url: 'https://google.com',
      tableName: 'user',
      icon: 'heart',
      requireConfirmation: false
    }]
    component.newAction = {
      id: '',
      title: 'action 1',
      type: CustomActionType.Single,
      url: '',
      tableName: '',
      icon: '',
      requireConfirmation: false
    }

    component.handleAddNewAction()

    expect(component.actionNameError).toEqual('You already have an action with this name.');
  });

  it('should add new action to the list and switch to selected action', () => {
    const mockNewAction = {
      id: '',
      title: 'action 2',
      type: CustomActionType.Single,
      url: '',
      tableName: '',
      icon: '',
      requireConfirmation: false
    }

    component.actions = [{
      id: 'action_12345678',
      title: 'action 1',
      type: CustomActionType.Single,
      url: 'https://google.com',
      tableName: 'user',
      icon: 'heart',
      requireConfirmation: false
    }]

    component.newAction = mockNewAction;

    component.handleAddNewAction()

    expect(component.selectedAction).toEqual(mockNewAction);
    expect(component.updatedActionTitle).toEqual('action 2');
    expect(component.actions).toEqual([
      {
        id: 'action_12345678',
        title: 'action 1',
        type: CustomActionType.Single,
        url: 'https://google.com',
        tableName: 'user',
        icon: 'heart',
        requireConfirmation: false
      },
      {
        id: '',
        title: 'action 2',
        type: CustomActionType.Single,
        url: '',
        tableName: '',
        icon: '',
        requireConfirmation: false
      }
    ]);
    expect(component.newAction).toBeNull();
  });

  it('should remove action if it is not saved and if it is not in the list yet and the list is empty', () => {
    component.newAction = {
      id: '',
      title: 'action 1',
      type: CustomActionType.Single,
      url: '',
      tableName: '',
      icon: '',
      requireConfirmation: false
    }
    component.actions = [];

    component.undoAction();

    expect(component.selectedAction).toBeNull();
    expect(component.newAction).toBeNull();
  });

  it('should remove action if it is not saved and if it is not in the list yet and switch to the first action in the list', () => {
    const mockAction = {
      id: '',
      title: 'action 1',
      type: CustomActionType.Single,
      url: 'https://google.com',
      tableName: 'user',
      icon: 'heart',
      requireConfirmation: false
    };
    component.newAction = {
      id: '',
      title: 'action 2',
      type: CustomActionType.Single,
      url: '',
      tableName: '',
      icon: '',
      requireConfirmation: false
    }
    component.actions = [ mockAction ];

    component.undoAction();

    expect(component.selectedAction).toEqual(mockAction);
    expect(component.newAction).toBeNull();
  });

  it('should call remove action from the list when it is not saved', () => {
    component.selectedAction = {
      id: '',
      title: 'action 1',
      type: CustomActionType.Single,
      url: 'https://google.com',
      tableName: 'user',
      icon: 'heart',
      requireConfirmation: false
    };
    const mockRemoveActionFromLocalList = spyOn(component, 'removeActionFromLocalList');

    component.handleRemoveAction();

    expect(mockRemoveActionFromLocalList).toHaveBeenCalledOnceWith('action 1');
  });

  it('should call open delete confirm dialog when action is saved', () => {
    component.selectedAction = {
      id: 'action_12345678',
      title: 'action 1',
      type: CustomActionType.Single,
      url: 'https://google.com',
      tableName: 'user',
      icon: 'heart',
      requireConfirmation: false
    };
    const mockOpenDeleteActionDialog = spyOn(component, 'openDeleteActionDialog');

    component.handleRemoveAction();

    expect(mockOpenDeleteActionDialog).toHaveBeenCalledOnceWith();
  });

  it('should remove action from the list if it is not saved and if it is only one actions in the list', () => {
    component.actions = [
        {
        id: '',
        title: 'action 1',
        type: CustomActionType.Single,
        url: 'https://google.com',
        tableName: 'user',
        icon: 'heart',
        requireConfirmation: false
      }
    ];

    component.removeActionFromLocalList('action 1');

    expect(component.selectedAction).toBeNull();
    expect(component.actions).toEqual([]);
  });

  it('should remove action from the list if it is not saved and make active the first action in the list', () => {
    const mockAction =  {
      id: '',
      title: 'action 2',
      type: CustomActionType.Single,
      url: 'https://google.com',
      tableName: 'user',
      icon: 'star',
      requireConfirmation: false
    };
    component.actions = [
        {
        id: '',
        title: 'action 1',
        type: CustomActionType.Single,
        url: 'https://google.com',
        tableName: 'user',
        icon: 'heart',
        requireConfirmation: false
      },
      mockAction
    ];

    component.removeActionFromLocalList('action 1')

    expect(component.selectedAction).toEqual(mockAction);
    expect(component.actions).toEqual([mockAction]);
  });

  it('should save action', () => {
    const mockAction = {
      id: '',
      title: 'action 1',
      type: CustomActionType.Single,
      url: 'https://google.com',
      tableName: 'user',
      icon: 'heart',
      requireConfirmation: false
    };
    component.connectionID = '12345678';
    component.tableName = 'users'
    component.selectedAction = mockAction;
    const fakeSavwAction = spyOn(tablesService, 'saveAction').and.returnValue(of());


    component.addAction();

    expect(fakeSavwAction).toHaveBeenCalledOnceWith('12345678', 'users', mockAction);
  });

  it('should open dialog for delete action confirmation', () => {
    const fakeConfirmationDialog = spyOn(dialog, 'open');

    const mockAction = {
      id: '',
      title: 'action 1',
      type: CustomActionType.Single,
      url: 'https://google.com',
      tableName: 'user',
      icon: 'heart',
      requireConfirmation: false
    };
    component.connectionID = '12345678';
    component.tableName = 'users'
    component.selectedAction = mockAction;

    component.openDeleteActionDialog();

    expect(fakeConfirmationDialog).toHaveBeenCalledOnceWith(ActionDeleteDialogComponent, {
      width: '25em',
      data: {
        connectionID: '12345678',
        tableName: 'users',
        action: mockAction
      }
    });
  });

  it('should show Copy message', () => {
    component.showCopyNotification('PHP code snippet was copied to clipboard.');
    expect(fakeNotifications.showSuccessSnackbar).toHaveBeenCalledOnceWith('PHP code snippet was copied to clipboard.')

    fakeNotifications.showSuccessSnackbar.calls.reset();
  });
});
