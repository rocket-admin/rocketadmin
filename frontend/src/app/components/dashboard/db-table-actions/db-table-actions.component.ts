import { AlertActionType, AlertType } from 'src/app/models/alert';
import { Angulartics2, Angulartics2OnModule } from 'angulartics2';
import { Component, OnInit } from '@angular/core';
import { CustomAction, CustomActionMethod, CustomActionType, CustomEvent, EventType, Rule } from 'src/app/models/table';

import { ActionDeleteDialogComponent } from './action-delete-dialog/action-delete-dialog.component';
import { AlertComponent } from '../../ui-components/alert/alert.component';
import { BreadcrumbsComponent } from '../../ui-components/breadcrumbs/breadcrumbs.component';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { CodeEditorModule } from '@ngstack/code-editor';
import { CommonModule } from '@angular/common';
import { CompanyMember } from 'src/app/models/company';
import { CompanyService } from 'src/app/services/company.service';
import { ConnectionsService } from 'src/app/services/connections.service';
import { ContentLoaderComponent } from '../../ui-components/content-loader/content-loader.component';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { IconPickerComponent } from '../../ui-components/icon-picker/icon-picker.component';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NotificationsService } from 'src/app/services/notifications.service';
import { TablesService } from 'src/app/services/tables.service';
import { Title } from '@angular/platform-browser';
import { UserService } from 'src/app/services/user.service';
import { codeSnippets } from 'src/app/consts/code-snippets';
import { normalizeTableName } from 'src/app/lib/normalize';
import { UiSettingsService } from 'src/app/services/ui-settings.service';

@Component({
  selector: 'app-db-table-actions',
  templateUrl: './db-table-actions.component.html',
  styleUrls: ['./db-table-actions.component.css'],
  imports: [
    CommonModule,
    ClipboardModule,
    FormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    MatSidenavModule,
    MatListModule,
    MatRadioModule,
    MatTabsModule,
    CodeEditorModule,
    AlertComponent,
    BreadcrumbsComponent,
    ContentLoaderComponent,
    IconPickerComponent,
    Angulartics2OnModule
  ]
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
  public codeEditorTheme: 'vs' | 'vs-dark' = 'vs-dark';

  constructor(
    private _connections: ConnectionsService,
    private _tables: TablesService,
    private _notifications: NotificationsService,
    private _company: CompanyService,
    private _userService: UserService,
    private _uiSettings: UiSettingsService,
    public dialog: MatDialog,
    private title: Title,
    private angulartics2: Angulartics2,
  ) { }

  async ngOnInit() {
    this.connectionID = this._connections.currentConnectionID;
    this.tableName = this._tables.currentTableName;
    this.normalizedTableName = normalizeTableName(this.tableName);
    this._connections.getCurrentConnectionSigningKey().subscribe(signingKey => this.codeSnippets = codeSnippets(signingKey));
    this.codeEditorTheme = this._uiSettings.editorTheme;

    try {
      this.rulesData = await this.getRules();
      console.log(this.rulesData);
      this.rules = this.rulesData.action_rules;
      if (this.rules.length) this.setSelectedRule(this.rules[0]);
      this.title.setTitle(`${this.rulesData.display_name || this.normalizedTableName} - Actions | ${this._company.companyTabTitle || 'Rocketadmin'}`);
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
    // this.codeSnippets = codeSnippets(this._connections.currentConnection.signing_key);
    return this._connections.currentConnection;
  }

  // get codeSnippets() {
  //   return codeSnippets(this._connections.currentConnection.signing_key);
  // }

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
        label: 'Rules for actions',
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
    }

    if (this.selectedRule.events.length < 4) {
      this.selectedRule.events.push({ event: null });
    }
  }

  removeEvent(event: any) {
    this.selectedRule.events = this.selectedRule.events.filter((e) => e.event !== event);
    this.selectedEvents = this.selectedRule.events.map((event) => event.event);

    if (event === EventType.Custom) {
      this.selectedRuleCustomEvent = null;
    }

    if (this.selectedRule.events.length === 3) {
      this.selectedRule.events.push({ event: null });
    }
  }
}
