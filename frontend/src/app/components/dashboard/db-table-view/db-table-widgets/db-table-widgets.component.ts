import { Angulartics2, Angulartics2OnModule } from 'angulartics2';
import { Component, OnInit } from '@angular/core';
import { TableField, Widget } from 'src/app/models/table';

import { AlertComponent } from '../../../ui-components/alert/alert.component';
import { BreadcrumbsComponent } from '../../../ui-components/breadcrumbs/breadcrumbs.component';
import { CodeEditComponent } from '../../../ui-components/record-edit-fields/code/code.component';
import { CommonModule } from '@angular/common';
import { CompanyService } from 'src/app/services/company.service';
import { ConnectionsService } from 'src/app/services/connections.service';
import { FormsModule } from '@angular/forms';
import { ImageEditComponent } from '../../../ui-components/record-edit-fields/image/image.component';
import { Location } from '@angular/common';
import { LongTextEditComponent } from '../../../ui-components/record-edit-fields/long-text/long-text.component';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { PasswordEditComponent } from '../../../ui-components/record-edit-fields/password/password.component';
import { PlaceholderTableWidgetsComponent } from '../../../skeletons/placeholder-table-widgets/placeholder-table-widgets.component';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { SelectEditComponent } from '../../../ui-components/record-edit-fields/select/select.component';
import { TablesService } from 'src/app/services/tables.service';
import { TextEditComponent } from '../../../ui-components/record-edit-fields/text/text.component';
import { Title } from '@angular/platform-browser';
import { UIwidgets } from "src/app/consts/record-edit-types";
import { UiSettingsService } from 'src/app/services/ui-settings.service';
import { UrlEditComponent } from '../../../ui-components/record-edit-fields/url/url.component';
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
  // JSON5-formatted default params
  public defaultParams = {
    Boolean:
`// Display "Yes/No" buttons with configurable options:
// - allow_null: Use "false" to require selection, "true" if field can be left unspecified
// - invert_colors: Swap the color scheme (typically green=Yes, red=No becomes red=Yes, green=No)

{
	"allow_null": false,
	"invert_colors": false
}
`,
    Code:
`// provide language of code to highlight: 'html', 'css', 'typescript', 'yaml', 'markdown'
// example:
{
  "language": "html"
}
`,
    Color: `// Optional: Specify output format for color values
// Supported formats: "hex", "hex_hash" (default), "rgb", "hsl"
// Example configuration:

{
  "format": "hex_hash"  // Will display colors as "#FF5733"
}

// Format options:
// - "hex": Display as "FF5733" (no hash)
// - "hex_hash": Display as "#FF5733" (default)
// - "rgb": Display as "rgb(255, 87, 51)"
// - "hsl": Display as "hsl(9, 100%, 60%)"`,
    Country: `// Configure country display options
// Example:
{
  "show_flag": true,
  "allow_null": false
}
`,
    Date: `// Configure date display options
// formatDistanceWithinHours: Shows relative time (e.g., "2 hours ago") for dates within the specified hours
// Default: 48 hours. Set to 0 to disable relative time display
{
  "formatDistanceWithinHours": 48
}`,
    DateTime: `// Configure datetime display options
// formatDistanceWithinHours: Shows relative time (e.g., "2 hours ago") for dates within the specified hours
// Default: 48 hours. Set to 0 to disable relative time display
{
  "formatDistanceWithinHours": 48
}`,
    Default: `// No settings required`,
    File:
`// provide type of file: 'hex', 'base64' or 'file'
// example:
{
  "type": "hex"
}
`,
    Foreign_key: `// Provide settings for foreign key widget
{
  "column_name": "", // copy the name of the column you selected
  "referenced_column_name": "",
  "referenced_table_name": ""
}
`,
    Image:
`// provide image height in px to dispaly in table
// prefix: optional URL prefix to prepend to image source
// example:
{
  "height": 100,
  "prefix": "https://example.com/images/"
}
`,
    JSON: `// No settings required`,
    Money: `// Configure money widget settings
// example:
{
  "default_currency": "USD",
  "decimal_places": 2,
  "allow_negative": true
}
`,
    Number: `// Configure number display with unit conversion and threshold validation
// Example units: "bytes", "meters", "seconds", "grams"
// threshold_min/threshold_max: Values outside these limits will be highlighted in red
{
  "unit": null,
  "threshold_min": null,
  "threshold_max": null
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
    Phone:
`// Configure international phone number widget
// example:
{
  "preferred_countries": ["US", "GB", "CA"],
  "enable_placeholder": true,
  "phone_validation": true
}
`,
    Range: `// Configure the minimum, maximum and step values for the range
// Default: min = 0, max = 100, step = 1
{
  "min": 0,
  "max": 100,
  "step": 1
}
`,
    Readonly: `// No settings required`,
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
    String: `// Optional validation for string values
// validate: Any validator.js method (e.g., "isEmail", "isURL", "isUUID", "isJSON", "isAlpha", "isNumeric")
// Full list: isEmail, isURL, isMACAddress, isIP, isIPRange, isFQDN, isBoolean, isIBAN, isBIC,
// isAlpha, isAlphanumeric, isNumeric, isPort, isLowercase, isUppercase, isAscii, isBase64,
// isHexadecimal, isHexColor, isRgbColor, isHSL, isMD5, isHash, isJWT, isJSON, isUUID,
// isMongoId, isCreditCard, isISBN, isISSN, isMobilePhone, isPostalCode, isEthereumAddress,
// isCurrency, isBtcAddress, isISO8601, isISO31661Alpha2, isISO31661Alpha3, isISO4217,
// isDataURI, isMagnetURI, isMimeType, isLatLong, isSlug, isStrongPassword, isTaxID, isVAT
// OR use "regex" with a regex parameter for custom pattern matching
{
  "validate": null,
  "regex": null
}`,
    Textarea: `// provide number of strings to show.
{
  "rows": 5
}`,
    Time: `// No settings required`,
    URL: `// prefix: optional URL prefix to prepend to the href
// example:
{
  "prefix": "https://example.com/"
}
`,
    UUID: `// Configure UUID generation version and parameters
// Available versions: "v1", "v3", "v4" (default), "v5", "v7"
// For v3/v5: provide namespace and optionally name
{
  "version": "v4",
  "namespace": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "name": ""
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
      widget_type: 'Default',
      widget_params: '// No settings required',
      name: '',
      description: ''
    });
  }

  selectWidgetField(column_name: string) {
    this.fields.splice(this.fields.indexOf(column_name), 1)
  }

  widgetTypeChange(fieldName) {
    let currentWidget = this.widgets.find(widget => widget.field_name === fieldName);
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
        res.forEach((widget: Widget) => {
          if (widget.widget_type === '') widget.widget_type = 'Default';
        })
        this.widgets = res;
      });
  }

  updateWidgets(afterDeleteAll?: boolean) {
    this.submitting = true;

    this.widgets.forEach(widget => {
      if (widget.widget_type === 'Default') widget.widget_type = '';
    });

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
