import { AlertActionType, AlertType } from 'src/app/models/alert';
import { Component, OnInit } from '@angular/core';
import { CustomAction, CustomActionMethod, CustomActionType, CustomEvent, EventType, Rule } from 'src/app/models/table';

import { ActionDeleteDialogComponent } from './action-delete-dialog/action-delete-dialog.component';
import { Angulartics2 } from 'angulartics2';
import { CompanyMember } from 'src/app/models/company';
import { CompanyService } from 'src/app/services/company.service';
import { ConnectionsService } from 'src/app/services/connections.service';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { NotificationsService } from 'src/app/services/notifications.service';
import { TablesService } from 'src/app/services/tables.service';
import { Title } from '@angular/platform-browser';
import { UserService } from 'src/app/services/user.service';
import { codeSnippets } from 'src/app/consts/code-snippets';
import { normalizeTableName } from 'src/app/lib/normalize';

@Component({
  selector: 'app-db-table-actions',
  templateUrl: './db-table-actions.component.html',
  styleUrls: ['./db-table-actions.component.css']
})
export class DbTableActionsComponent implements OnInit {
  public connectionID: string | null = null;
  public tableName: string | null = null;
  public normalizedTableName: string;
  public rulesData: {
    table_name: string,
    display_name: string,
    action_rules: Rule[]
  };
  public rules: Rule[];
  public submitting: boolean;
  public selectedRule: Rule = null;
  public selectedRuleCustomEvent: CustomEvent = null;
  public customAction: CustomAction = null;
  public selectedRuleTitle: string;
  public newRule: Rule =null;
  public newAction: CustomAction =null;
  public actionNameError: string;
  public codeSnippets: object;
  public companyMembers: CompanyMember[];

  public defaultIcons = ['favorite_outline', 'star_outline', 'done', 'arrow_forward', 'key_outline', 'lock', 'visibility', 'language', 'notifications', 'schedule'];

  public codeLangSelected: string = 'cs';
  public signingKey: string;

  public codeViewerOptions = {
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    wordWrap: 'on',
    automaticLayout: true,
  };

  public availableEvents = [
    { value: EventType.AddRow, label: 'Add row' },
    { value: EventType.UpdateRow, label: 'Update row' },
    { value: EventType.DeleteRow, label: 'Delete row' },
    { value: EventType.Custom, label: 'Custom' }
  ];
  public selectedEvents: string[] = [];

  constructor(
    private _connections: ConnectionsService,
    private _tables: TablesService,
    private _notifications: NotificationsService,
    private _company: CompanyService,
    private _userService: UserService,
    public dialog: MatDialog,
    private title: Title,
    private angulartics2: Angulartics2,
  ) { }

  async ngOnInit() {
    this.connectionID = this._connections.currentConnectionID;
    this.signingKey = this._connections.currentConnection.signing_key;
    this.tableName = this._tables.currentTableName;
    this.normalizedTableName = normalizeTableName(this.tableName);
    this.codeSnippets = codeSnippets(this._connections.currentConnection.signing_key);

    try {
      this.rulesData = await this.getRules();
      console.log(this.rulesData);
      this.rules = this.rulesData.action_rules;
      if (this.rules.length) this.setSelectedRule(this.rules[0]);
      this.title.setTitle(`${this.rulesData.display_name || this.normalizedTableName} - Actions | Rocketadmin`);
    } catch(error) {
      if (error instanceof HttpErrorResponse) {
        this.rulesData = null;
        console.log(error.error.message);
      } else  { throw error };
    }

    this._userService.cast
      .subscribe(user => {
        this._company.fetchCompanyMembers(user.company.id).subscribe(members => {
          this.companyMembers = members;
        })
      });

    this._tables.cast.subscribe(async (arg) =>  {
      if (arg === 'delete-rule') {
        try {
          this.rulesData = await this.getRules();
          console.log(this.rulesData);
          this.rules = this.rulesData.action_rules;
          this.selectedRule = this.rules[0];
          this.selectedRuleTitle = this.selectedRule.title;
        } catch(error) {
          if (error instanceof HttpErrorResponse) {
            console.log(error.error.message);
          } else  { throw error };
        }
      }
    });
  }

  get currentConnection() {
    return this._connections.currentConnection;
  }

  getCrumbs(name: string) {
    return [
      {
        label: name,
        link: `/dashboard/${this.connectionID}`
      },
      {
        label: this.rulesData.display_name || this.normalizedTableName,
        link: `/dashboard/${this.connectionID}/${this.tableName}`
      },
      {
        label: 'Rules',
        link: null
      }
    ]
  }

  trackByFn(index: number) {
    return index; // or item.id
  }

  setSelectedRule(rule: Rule) {
    this.selectedRule = rule;
    this.selectedRuleTitle = rule.title;
    if (this.selectedRule.events[this.selectedRule.events.length - 1].event !== null) this.selectedRule.events.push({ event: null });
    this.selectedEvents = this.selectedRule.events.map((event) => event.event);

    const customEvent = this.selectedRule.events.find((event) => event.event === EventType.Custom);
    if (customEvent) {
        this.selectedRuleCustomEvent = customEvent as CustomEvent;
    } else {
        this.selectedRuleCustomEvent = null;
    }
  }

  updateIcon(icon: string) {
    this.selectedRuleCustomEvent.icon = icon;
  }

  switchRulesView(rule: Rule) {
    this.setSelectedRule(rule);
  }

  addNewRule() {
    this.newRule = {
      id: '',
      title: '',
      table_name: this.tableName,
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
    };

    this.setSelectedRule(this.newRule);
  }

  addNewAction() {
    this.newAction = {
      method: CustomActionMethod.URL,
      emails: [],
      url: '',
    };
  }

  handleAddNewRule() {
    this.actionNameError = null;
    if (this.newRule.title === '') {
      this.actionNameError = 'The name cannot be empty.';
    } else {
      const coinsidingName = this.rules.find((rule: Rule) => rule.title === this.newRule.title);
      if (!coinsidingName) {
        this.selectedRule = {... this.newRule};
        this.selectedRuleTitle = this.selectedRule.title;
        this.rules.push(this.selectedRule);
        this.newRule = null;
      } else {
        this.actionNameError = 'You already have an action with this name.'
      }
    }
  }

  undoRule() {
    this.newRule = null;
    if (this.rules.length) this.setSelectedRule(this.rules[0]);
  }

  handleRemoveRule() {
    if (this.selectedRule.id) {
      this.openDeleteRuleDialog();
    } else {
      this.removeRuleFromLocalList(this.selectedRule.title)
    }
  }

  removeRuleFromLocalList(ruleTitle: string) {
    this.rules = this.rules.filter((rule: Rule)  => rule.title != ruleTitle);
    if (this.rules.length) this.setSelectedRule(this.rules[0]);
  }

  getRules() {
    return this._tables.fetchRules(this.connectionID, this.tableName).toPromise();
  }

  handleRuleSubmitting() {
    if (this.selectedRule.events.filter(event => event.event !== null).length > 0) {
      if (this.selectedRule.id) {
        this.updateRule();
      } else {
        this.addRule();
      }
    }
  }

  addRule() {
    this.submitting = true;
    this.selectedRule.events = this.selectedRule.events.filter((event) => event.event !== null);
    this.selectedRule.events = this.selectedRule.events.map(event => {
      if (event.event === 'CUSTOM') {
        return {...event, ...this.selectedRuleCustomEvent};
      }
      return event;
    });

    this._tables.saveRule(this.connectionID, this.tableName, this.selectedRule)
      .subscribe(async (res) => {
        this.submitting = false;
        this.angulartics2.eventTrack.next({
          action: 'Rules: rule is saved successfully'
        });
        try {
          const undatedRulesData = await this.getRules();
          this.rules = undatedRulesData.action_rules;
          const currentRule = this.rules.find((rule: Rule) => rule.id === res.id);
          this.setSelectedRule(currentRule);
        } catch(error) {
          if (error instanceof HttpErrorResponse) {
            console.log(error.error.message);
          } else  { throw error };
        }
      },
        () => this.submitting = false,
        () => this.submitting = false
      )
  }

  updateRule() {
    this.submitting = true;
    this.selectedRule.events = this.selectedRule.events.filter((event) => event.event !== null);
    if (this.selectedRuleTitle) this.selectedRule.title = this.selectedRuleTitle;
    this.selectedRule.events = this.selectedRule.events.map(event => {
      if (event.event === 'CUSTOM') {
        return {...event, ...this.selectedRuleCustomEvent};
      }
      return event;
    });

    this._tables.updateRule(this.connectionID, this.tableName, this.selectedRule)
      .subscribe(async (res) => {
        this.submitting = false;
        try {
          const undatedRulesData = await this.getRules();
          this.rules = undatedRulesData.action_rules;
          const currentRule = this.rules.find((rule: Rule) => rule.id === res.id);
          this.setSelectedRule(currentRule);
        } catch(error) {
          if (error instanceof HttpErrorResponse) {
            console.log(error.error.message);
          } else  { throw error };
        }
      },
        () => this.submitting = false,
        () => this.submitting = false
      )
  }

  openDeleteRuleDialog() {
    this.dialog.open(ActionDeleteDialogComponent, {
      width: '25em',
      data: {
        connectionID: this.connectionID,
        tableName: this.tableName,
        rule: this.selectedRule
      }
    })
  }

  showCopyNotification(message: string) {
    this._notifications.showSuccessSnackbar(message);
  }

  onEventChange(event: any) {
    console.log(this.selectedRule.events);
    this.selectedEvents.push(event.value);

    let customEvent = this.selectedRule.events.find((event) => event.event === EventType.Custom);

    if (event.value === EventType.Custom) {
      customEvent = {
        ...customEvent,
        title: '',
        type: CustomActionType.Single,
        icon: '',
        require_confirmation: false
      };
      // this.selectedRule.events.push(customEvent);
      this.selectedRuleCustomEvent = customEvent;
    } else if (this.selectedRule.events.length < 4) {
      this.selectedRule.events.push({ event: null });
    }
  }

  removeEvent(event: any) {
    this.selectedRule.events = this.selectedRule.events.filter((e) => e.event !== event);
    this.selectedEvents = this.selectedRule.events.map((event) => event.event);
    if (event === EventType.Custom) {
      this.selectedRuleCustomEvent = null;
    }
  }
}
