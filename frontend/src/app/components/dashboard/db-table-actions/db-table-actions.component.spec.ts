import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { ActionDeleteDialogComponent } from './action-delete-dialog/action-delete-dialog.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CustomActionMethod, CustomActionType } from 'src/app/models/table';
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
        Angulartics2Module.forRoot(),
        DbTableActionsComponent
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

  it('should set selected rule', () => {
    const rule = {
      id: 'rule_12345678',
      title: 'rule 1',
      table_name: 'user',
      events: [
        {
          event: null
        }
      ],
      table_actions: []
    }
    component.setSelectedRule(rule)
    expect(component.selectedRule).toEqual(rule);
    expect(component.selectedRuleTitle).toEqual('rule 1');
  });

  it('should switch between rules on rules list click', () => {
    const rule = {
      id: 'rule_12345678',
      title: 'rule 1',
      table_name: 'user',
      events: [],
      table_actions: []
    }
    const mockSetSelectedAction = spyOn(component, 'setSelectedRule');

    component.switchRulesView(rule)

    expect(mockSetSelectedAction).toHaveBeenCalledOnceWith(rule)
  });

  it('should set the new rule', () => {
    component.tableName = 'user';
    component.addNewRule()

    expect(component.newRule).toEqual({
      id: '',
      title: '',
      table_name: 'user',
      events: [
        {
          event: null
        }
      ],
      table_actions: [
        {
          method: CustomActionMethod.URL,
          emails: [],
          url: '',
        }
      ]
    })
  });

  it('should set an error if user try to add rule with empty name to the list', () => {
    component.newRule = {
      id: '',
      title: '',
      table_name: 'user',
      events: [
        {
          event: null
        }
      ],
      table_actions: [
        {
          method: CustomActionMethod.URL,
          emails: [],
          url: '',
        }
      ]
    }
    component.handleAddNewRule()

    expect(component.actionNameError).toEqual('The name cannot be empty.');
  });

  it('should set an error if user try to add rule with the same name to the list', () => {
    component.rules = [{
      id: '',
      title: 'rule 1',
      table_name: 'user',
      events: [],
      table_actions: []
    }]
    component.newRule = {
      id: '',
      title: 'rule 1',
      table_name: 'user',
      events: [],
      table_actions: []
    }

    component.handleAddNewRule()

    expect(component.actionNameError).toEqual('You already have an action with this name.');
  });

  it('should add new rule to the list and switch to selected rule', () => {
    const mockNewRule = {
      id: '',
      title: 'rule 2',
      table_name: 'user',
      events: [],
      table_actions: []
    }

    component.rules = [{
      id: 'rule_12345678',
      title: 'rule 1',
      table_name: 'user',
      events: [],
      table_actions: []
    }]

    component.newRule = mockNewRule;

    component.handleAddNewRule()

    expect(component.selectedRule).toEqual(mockNewRule);
    expect(component.selectedRuleTitle).toEqual('rule 2');
    expect(component.rules).toEqual([
      {
        id: 'rule_12345678',
        title: 'rule 1',
        table_name: 'user',
        events: [],
        table_actions: []
      },
      {
        id: '',
        title: 'rule 2',
        table_name: 'user',
        events: [],
        table_actions: []
      }
    ]);
    expect(component.newRule).toBeNull();
  });

  it('should remove rule if it is not saved and if it is not in the list yet and the list is empty', () => {
    component.newRule = {
      id: '',
      title: 'rule 2',
      table_name: 'user',
      events: [],
      table_actions: []
    }

    component.rules = [];

    component.undoRule();

    expect(component.selectedRule).toBeNull();
    expect(component.newRule).toBeNull();
  });

  it('should remove rule if it is not saved and if it is not in the list yet and switch to the first rule in the list', () => {
    const mockRule = {
        id: 'rule_12345678',
        title: 'rule 1',
        table_name: 'user',
        events: [
          {
            event: null
          }
        ],
        table_actions: []
    };
    component.newRule = {
        id: '',
        title: 'rule 2',
        table_name: 'user',
        events: [
          {
            event: null
          }
        ],
        table_actions: []
    }
    component.rules = [ mockRule ];

    component.undoRule();

    expect(component.selectedRule).toEqual(mockRule);
    expect(component.newRule).toBeNull();
  });

  it('should call remove action from the list when it is not saved', () => {
    component.selectedRule = {
        id: '',
        title: 'rule 1',
        table_name: 'user',
        events: [],
        table_actions: []
    };
    const mockRemoveRuleFromLocalList = spyOn(component, 'removeRuleFromLocalList');

    component.handleRemoveRule();

    expect(mockRemoveRuleFromLocalList).toHaveBeenCalledOnceWith('rule 1');
  });

  it('should call open delete confirm dialog when action is saved', () => {
    component.selectedRule = {
        id: 'rule_12345678',
        title: 'rule 1',
        table_name: 'user',
        events: [],
        table_actions: []
    };
    const mockOpenDeleteRuleDialog = spyOn(component, 'openDeleteRuleDialog');

    component.handleRemoveRule();

    expect(mockOpenDeleteRuleDialog).toHaveBeenCalledOnceWith();
  });

  it('should remove rule from the list if it is not saved and if it is only one actions in the list', () => {
    component.rules = [
      {
        id: 'rule_12345678',
        title: 'rule 1',
        table_name: 'user',
        events: [],
        table_actions: []
      }
    ];

    component.removeRuleFromLocalList('rule 1');

    expect(component.selectedRule).toBeNull();
    expect(component.rules).toEqual([]);
  });

  it('should remove rule from the list if it is not saved and make active the first rule in the list', () => {
    const mockRule =  {
      id: '',
      title: 'rule 2',
      table_name: 'user',
      events: [
        {
          event: null
        }
      ],
      table_actions: []
    };
    component.rules = [
      {
        id: '',
        title: 'rule 1',
        table_name: 'user',
        events: [
          {
            event: null
          }
        ],
        table_actions: []
      },
      mockRule
    ];

    component.removeRuleFromLocalList('rule 1')

    expect(component.selectedRule).toEqual(mockRule);
    expect(component.rules).toEqual([mockRule]);
  });

  it('should save rule', () => {
    component.tableName = 'users';
    const mockRule = {
      id: '',
      title: 'rule 2',
      table_name: '',
      events: [],
      table_actions: []
    };
    component.connectionID = '12345678';
    component.selectedRule = mockRule;
    const fakeSaveAction = spyOn(tablesService, 'saveRule').and.returnValue(of());


    component.addRule();

    expect(fakeSaveAction).toHaveBeenCalledOnceWith('12345678', 'users', mockRule);
  });

  it('should open dialog for delete action confirmation', () => {
    const fakeConfirmationDialog = spyOn(dialog, 'open');

    const mockRule = {
      id: '',
      title: 'rule 2',
      table_name: 'user',
      events: [],
      table_actions: []
    };
    component.connectionID = '12345678';
    component.tableName = 'users';
    component.selectedRule = mockRule;

    component.openDeleteRuleDialog();

    expect(fakeConfirmationDialog).toHaveBeenCalledOnceWith(ActionDeleteDialogComponent, {
      width: '25em',
      data: {
        connectionID: '12345678',
        tableName: 'users',
        rule: mockRule
      }
    });
  });

  it('should show Copy message', () => {
    component.showCopyNotification('PHP code snippet was copied to clipboard.');
    expect(fakeNotifications.showSuccessSnackbar).toHaveBeenCalledOnceWith('PHP code snippet was copied to clipboard.')

    fakeNotifications.showSuccessSnackbar.calls.reset();
  });
});
