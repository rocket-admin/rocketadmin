import { Angulartics2, Angulartics2OnModule } from 'angulartics2';
import { Component, OnInit } from '@angular/core';
import { TableField, Widget } from 'src/app/models/table';

import { AlertComponent } from '../../ui-components/alert/alert.component';
import { BreadcrumbsComponent } from '../../ui-components/breadcrumbs/breadcrumbs.component';
import { CodeEditComponent } from '../../ui-components/record-edit-fields/code/code.component';
import { CommonModule } from '@angular/common';
import { CompanyService } from 'src/app/services/company.service';
import { ConnectionsService } from 'src/app/services/connections.service';
import { FormsModule } from '@angular/forms';
import { ImageEditComponent } from '../../ui-components/record-edit-fields/image/image.component';
import { Location } from '@angular/common';
import { LongTextEditComponent } from '../../ui-components/record-edit-fields/long-text/long-text.component';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { PasswordEditComponent } from '../../ui-components/record-edit-fields/password/password.component';
import { PlaceholderTableWidgetsComponent } from '../../skeletons/placeholder-table-widgets/placeholder-table-widgets.component';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { SelectEditComponent } from '../../ui-components/record-edit-fields/select/select.component';
import { TablesService } from 'src/app/services/tables.service';
import { TextEditComponent } from '../../ui-components/record-edit-fields/text/text.component';
import { Title } from '@angular/platform-browser';
import { UIwidgets } from "src/app/consts/record-edit-types";
import { UiSettingsService } from 'src/app/services/ui-settings.service';
import { UrlEditComponent } from '../../ui-components/record-edit-fields/url/url.component';
import { WidgetComponent } from './widget/widget.component';
import { WidgetDeleteDialogComponent } from './widget-delete-dialog/widget-delete-dialog.component';
import { difference } from "lodash";
import { normalizeTableName } from 'src/app/lib/normalize';

@Component({
  selector: 'app-db-table-widgets',
  templateUrl: './db-table-widgets.component.html',
  styleUrls: ['./db-table-widgets.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    RouterModule,
    AlertComponent,
    PlaceholderTableWidgetsComponent,
    BreadcrumbsComponent,
    PasswordEditComponent,
    ImageEditComponent,
    CodeEditComponent,
    WidgetComponent,
    TextEditComponent,
    LongTextEditComponent,
    SelectEditComponent,
    Angulartics2OnModule
  ],
})
export class DbTableWidgetsComponent implements OnInit {

  public connectionID: string | null = null;
  public tableName: string | null = null;
  public dispalyTableName: string;
  public fields: string[] = [];
  public fieldsCount: number;
  public widgets: Widget[] = null;
  public widgetTypes = Object.keys(UIwidgets);
  public submitting: boolean = false;
  public widgetsWithSettings: string[];
  public codeEditorTheme: 'vs' | 'vs-dark' = 'vs-dark';
  public paramsEditorOptions = {
    minimap: { enabled: false },
    lineNumbersMinChars:  3,
    folding: false,
    automaticLayout: true,
    scrollBeyondLastLine: false,
    wordWrap: 'on',
  };
  public widgetCodeEample = `<h1 class="post-title">Why UI Customization Matters in Admin Panels</h1>
<p class="post-paragraph">
  A well-designed <strong>admin panel</strong> isn’t just about managing data — it’s about making that data easier to understand and interact with. By customizing how each field is displayed, you can turn raw database values into meaningful, user-friendly interfaces that save time and reduce errors.
</p>`;
  public defaultParams = {
    Boolean:
`// Display "Yes/No" buttons and specify "allow_null" in field structure:
// Use "false" to require that one of the buttons is selected;
// Use "true" if the field might be left unspecified.

{
	"structure": {
		"allow_null": false
	}
}`,
    Date: `// No settings required`,
    Default: `// No settings required`,
    Time: `// No settings required`,
    DateTime: `// No settings required`,
    JSON: `// No settings required`,
    Textarea: `// provide number of strings to show.
{
  "rows": 5
}`,
    String: `// No settings required`,
    Readonly: `// No settings required`,
    Number: `// Configure number display with unit conversion
// Example units: "bytes", "meters", "seconds", "grams"
{
  "unit": null
}`,
    Select:
`// provide array of options to map database value (key 'value') in human readable value (key 'label');
// for example:
// AK => Alaska,
// CA => California

{
  "allow_null": true,
  "options": [
    {
      "value": "UA",
      "label": "🇺🇦 Ukraine"
    },
    {
      "value": "PL",
      "label": "🇵🇱 Poland"
    },
    {
      "value": "US",
      "label": "🇺🇸 United States"
    }
  ]
}`,
    Password:
`// provide algorithm to encrypt your password, one of:
//sha1, sha3, sha224, sha256, sha512, sha384, bcrypt, scrypt, argon2, pbkdf2.
// example:

{
  "encrypt": true,
  "algorithm": "sha256"
}

`,
    File:
`// provide type of file: 'hex', 'base64' or 'file'
// example:
{
  "type": "hex"
}
`,
  Code:
`// provide language of code to highlight: 'html', 'css', 'typescript', 'yaml', 'markdown'
// example:
{
  "language": "html"
}
`,
    Image:
`// provide image height in px to dispaly in table
// example:
{
  "height": 100
}
`,
  URL: `// No settings required`,
  Phone:
`// Configure international phone number widget
// example:
{
  "preferred_countries": ["US", "GB", "CA"],
  "enable_placeholder": true,
  "phone_validation": true
}
`,
  Country: `// No settings required`,
  Foreign_key: `// Provide settings for foreign key widget
{
  "column_name": "", // copy the name of the column you selected
  "referenced_column_name": "",
  "referenced_table_name": ""
}
`,
  Money: `// Configure money widget settings
// example:
{
  "default_currency": "USD",
  "show_currency_selector": false,
  "decimal_places": 2,
  "allow_negative": true
}
`,
  }

  constructor(
    private _connections: ConnectionsService,
    private _tables: TablesService,
    private _location: Location,
    private _uiSettings: UiSettingsService,
    private _company: CompanyService,
    public dialog: MatDialog,
    public router: Router,
    private title: Title,
    private angulartics2: Angulartics2,
  ) {}

  ngOnInit(): void {
    this.connectionID = this._connections.currentConnectionID;
    this.tableName = this._tables.currentTableName;
    this.widgetsWithSettings = Object
      .entries(this.defaultParams)
      .filter(([key, value]) => value !== '// No settings required')
      .map(widgetDefault => widgetDefault[0]);

    this._tables.fetchTableStructure(this.connectionID, this.tableName)
      .subscribe(res => {
        this.fieldsCount = res.structure.length;
        this.fields = res.structure.map((field: TableField) => field.column_name);
        this.dispalyTableName = res.display_name || normalizeTableName(this.tableName);
        this.title.setTitle(`${this.dispalyTableName} - Field display | ${this._company.companyTabTitle || 'Rocketadmin'}`);
        this.getWidgets();
      })
    this.codeEditorTheme = this._uiSettings.editorTheme;
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
        label: this.dispalyTableName,
        link: `/dashboard/${this.connectionID}/${this.tableName}`
      },
      {
        label: 'UI Widgets',
        link: null
      }
    ]
  }

  goBack() {
    this._location.back();
  }

  addNewWidget() {
    this.widgets.push({
      field_name: '',
      widget_type: '',
      widget_params: '',
      name: '',
      description: ''
    });
  }

  selectWidgetField(column_name: string) {
    this.fields.splice(this.fields.indexOf(column_name), 1)
  }

  widgetTypeChange(fieldName) {
    let currentWidget = this.widgets.find(widget => widget.field_name === fieldName);

    if (currentWidget.widget_type === 'Default') currentWidget.widget_type = '';
    currentWidget.widget_params = this.defaultParams[currentWidget.widget_type || 'Default'];

    this.widgetParamsChange({fieldName: currentWidget.field_name, value: currentWidget.widget_params});
  }

  isReadOnly(type: string) {
    return !this.widgetsWithSettings.includes(type);
  }

  widgetParamsChange(e: {
    fieldName: string,
    value: any
  }) {
    let currentWidget = this.widgets.find(widget => widget.field_name === e.fieldName);
    currentWidget.widget_params = e.value;
  }

  openDeleteWidgetDialog(widgetFieldName: string) {
    const dialogRef = this.dialog.open(WidgetDeleteDialogComponent, {
      width: '25em',
      data: widgetFieldName
    })

    dialogRef.afterClosed().subscribe(action => {
      if (action === 'delete') {
        this.fields.push(widgetFieldName);
        this.widgets = this.widgets.filter((widget) => widget.field_name !== widgetFieldName);
        this.updateWidgets(true);
      }
    })
  }

  openClearAllConfirmation() {
    const dialogRef = this.dialog.open(WidgetDeleteDialogComponent, {
      width: '25em'
    })

    dialogRef.afterClosed().subscribe(action => {
      if (action === 'delete') {
        const widgetsToDelete = this.widgets.map(widget => widget.field_name);
        this.fields = [...this.fields, ...widgetsToDelete];
        this.widgets = [];
        this.updateWidgets(true);
      }
    })
  }

  getWidgets() {
    this._tables.fetchTableWidgets(this.connectionID, this.tableName)
      .subscribe(res => {
        const currentWidgetTypes = res.map((widget: Widget) => widget.field_name);
        this.fields = difference(this.fields, currentWidgetTypes);
        this.widgets = res;
      });
  }

  updateWidgets(afterDeleteAll?: boolean) {
    this.submitting = true;
    this._tables.updateTableWidgets(this.connectionID, this.tableName, this.widgets)
      .subscribe(() => {
        this.submitting = false;
        this.angulartics2.eventTrack.next({
          action: 'Widgets: widgets are updated successfully'
        });
        if (!afterDeleteAll) this.router.navigate([`/dashboard/${this.connectionID}/${this.tableName}`]);
      },
      undefined,
      () => {this.submitting = false});
  }
}
