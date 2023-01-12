import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterTestingModule } from '@angular/router/testing';
import { CustomActionType } from 'src/app/models/table';

import { DbTableActionsComponent } from './db-table-actions.component';

fdescribe('DbTableActionsComponent', () => {
  let component: DbTableActionsComponent;
  let fixture: ComponentFixture<DbTableActionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DbTableActionsComponent ],
      providers: [ HttpClientTestingModule ],
      imports: [
        HttpClientTestingModule,
        RouterTestingModule,
        MatDialogModule,
        MatSnackBarModule
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DbTableActionsComponent);
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
      icon: 'heart'
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
      icon: 'heart'
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
      icon: ''
    })
  });

  it('should set an error if user try to add action with empty name to the list', () => {
    component.newAction = {
      id: '',
      title: '',
      type: CustomActionType.Single,
      url: '',
      tableName: '',
      icon: ''
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
      icon: 'heart'
    }]
    component.newAction = {
      id: '',
      title: 'action 1',
      type: CustomActionType.Single,
      url: '',
      tableName: '',
      icon: ''
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
      icon: ''
    }

    component.actions = [{
      id: 'action_12345678',
      title: 'action 1',
      type: CustomActionType.Single,
      url: 'https://google.com',
      tableName: 'user',
      icon: 'heart'
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
        icon: 'heart'
      },
      {
        id: '',
        title: 'action 2',
        type: CustomActionType.Single,
        url: '',
        tableName: '',
        icon: ''
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
      icon: ''
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
      icon: 'heart'
    };
    component.newAction = {
      id: '',
      title: 'action 2',
      type: CustomActionType.Single,
      url: '',
      tableName: '',
      icon: ''
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
      icon: 'heart'
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
      icon: 'heart'
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
        icon: 'heart'
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
      icon: 'star'
    };
    component.actions = [
        {
        id: '',
        title: 'action 1',
        type: CustomActionType.Single,
        url: 'https://google.com',
        tableName: 'user',
        icon: 'heart'
      },
      mockAction
    ];

    component.removeActionFromLocalList('action 1')

    expect(component.selectedAction).toEqual(mockAction);
    expect(component.actions).toEqual([mockAction]);
  });

  it('should add action', () => {
    component.selectedAction =  {
      id: '',
      title: 'action 2',
      type: CustomActionType.Single,
      url: 'https://google.com',
      tableName: 'user',
      icon: 'star'
    };

    component.addAction();

    expect(component.selectedAction).toEqual(mockAction);
    expect(component.actions).toEqual([mockAction]);
  });
});
