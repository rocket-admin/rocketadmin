# Widget System Documentation

## Overview

The widget system in RocketAdmin allows customization of how database fields are displayed and edited in the UI. Each field in a database table can be assigned a specific widget type with custom parameters to control its behavior and appearance.

### Widget Contexts

Widgets are implemented across **four different contexts**, each serving a specific purpose in the UI:

| Context | Location | Purpose | Editable | Base Component |
|---------|----------|---------|----------|----------------|
| **Record Edit Fields** | Create/Edit forms | Interactive input for data entry | ✅ Yes | `BaseEditFieldComponent` |
| **Record View Fields** | Single record detail page | Read-only formatted display | ❌ No | `BaseRecordViewFieldComponent` |
| **Table Display Fields** | Table rows | Compact display in lists | ❌ No | `BaseTableDisplayFieldComponent` |
| **Filter Fields** | Filter panels | Search and filter inputs | ✅ Yes | `BaseFilterFieldComponent` |

**Example:** The `Boolean` widget type has four implementations:
- `record-edit-fields/boolean/` - Checkbox toggle for editing
- `record-view-fields/boolean/` - "Yes/No" or icon display
- `table-display-fields/boolean/` - Badge or icon in table cells
- `filter-fields/boolean/` - True/False/All dropdown for filtering

## Table of Contents

1. [Where Widgets Are Stored](#where-widgets-are-stored)
   - [Backend (Database & Entity)](#backend-database--entity)
   - [Frontend (UI Components)](#frontend-ui-components)
     - [Record Edit Fields](#1-record-edit-fields-record-edit-fields)
     - [Record View Fields](#2-record-view-fields-record-view-fields)
     - [Table Display Fields](#3-table-display-fields-table-display-fields)
     - [Filter Fields](#4-filter-fields-filter-fields)
   - [Shared Code](#shared-code)
2. [Widget Structure](#widget-structure)
3. [Available Widget Types](#available-widget-types)
4. [How to Add a New Widget](#how-to-add-a-new-widget)
5. [Widget Lifecycle](#widget-lifecycle)
6. [Widget Parameters Examples](#widget-parameters-examples)
7. [Testing](#testing)
8. [Real-World Example: Timezone Widget](#real-world-example-timezone-widget)
9. [Important Notes](#important-notes)
10. [Key Files Reference](#key-files-reference)

---

## Where Widgets Are Stored

### Backend (Database & Entity)

**Database:**
- **Table:** `table_widget` (PostgreSQL)
- **Entity:** `backend/src/entities/widget/table-widget.entity.ts`
- **Relationship:** Many-to-one with `table_settings` (CASCADE delete)

**Key Backend Files:**
```
backend/src/entities/widget/
├── table-widget.entity.ts          # Entity definition
├── table-widget.controller.ts      # API endpoints
├── table-widget.module.ts          # Module registration
├── repository/                     # Custom repository
├── use-cases/                      # Business logic
└── utils/                          # Validation utilities
```

### Frontend (UI Components)

The frontend implements widgets across **four different contexts**, each with its own set of components:

#### 1. Record Edit Fields (`record-edit-fields/`)
**Purpose:** Interactive form inputs for editing/creating records
**Base Component:** `BaseEditFieldComponent`
**Key Features:**
- Two-way data binding with `@Output() onFieldChange`
- Supports validation, required fields, disabled/readonly states
- Full CRUD functionality

**Available Components:**
```
frontend/src/app/components/ui-components/record-edit-fields/
├── boolean/          # Checkbox/toggle for true/false
├── code/             # Code editor with syntax highlighting
├── color/            # Color picker
├── country/          # Country selector with flags
├── date/             # Date picker
├── date-time/        # Date and time picker
├── file/             # File upload
├── foreign-key/      # Related record selector
├── image/            # Image upload with preview
├── json-editor/      # JSON editor
├── long-text/        # Multi-line textarea
├── money/            # Currency input
├── number/           # Numeric input
├── password/         # Password input with encryption
├── phone/            # International phone number
├── point/            # Geographic point input
├── range/            # Range slider
├── select/           # Dropdown select
├── static-text/      # Read-only text
├── text/             # Single-line text input
├── time/             # Time picker
├── time-interval/    # Time interval input
├── timezone/         # Timezone selector with UTC offsets
├── url/              # URL input with validation
└── uuid/             # UUID display/input
```

#### 2. Record View Fields (`record-view-fields/`)
**Purpose:** Read-only display for single record detail view
**Base Component:** `BaseRecordViewFieldComponent`
**Key Features:**
- Display-only (no editing)
- Copy-to-clipboard functionality via `@Output() onCopyToClipboard`
- Formatted value presentation

**Available Components:**
```
frontend/src/app/components/ui-components/record-view-fields/
├── boolean/          # Display boolean as Yes/No or icons
├── code/             # Syntax-highlighted code display
├── color/            # Color swatch display
├── country/          # Country name with flag
├── date/             # Formatted date display
├── date-time/        # Formatted datetime display
├── file/             # File download link
├── foreign-key/      # Related record link
├── image/            # Image display
├── json-editor/      # Formatted JSON display
├── long-text/        # Multi-line text display
├── money/            # Formatted currency display
├── number/           # Formatted number display
├── password/         # Masked password display
├── phone/            # Formatted phone number
├── point/            # Geographic coordinates display
├── range/            # Range value display
├── select/           # Selected option display
├── static-text/      # Plain text display
├── text/             # Text display
├── time/             # Formatted time display
├── time-interval/    # Time interval display
├── url/              # Clickable URL link
└── uuid/             # UUID display with copy option
```

#### 3. Table Display Fields (`table-display-fields/`)
**Purpose:** Compact, read-only display for table rows
**Base Component:** `BaseTableDisplayFieldComponent`
**Key Features:**
- Condensed display optimized for tables
- Copy-to-clipboard functionality
- Truncation for long values
- Inline formatting

**Available Components:**
```
frontend/src/app/components/ui-components/table-display-fields/
├── boolean/          # Icon or badge display
├── code/             # Truncated code snippet
├── color/            # Color swatch
├── country/          # Flag or country code
├── date/             # Short date format
├── date-time/        # Short datetime format
├── file/             # File icon/link
├── foreign-key/      # Related record link
├── image/            # Thumbnail image
├── json-editor/      # JSON preview (truncated)
├── long-text/        # Truncated text with tooltip
├── money/            # Currency symbol + amount
├── number/           # Formatted number
├── password/         # Masked (*****)
├── phone/            # Phone number
├── point/            # Coordinates
├── range/            # Range value
├── select/           # Selected option
├── static-text/      # Plain text
├── text/             # Text (truncated if long)
├── time/             # Time display
├── time-interval/    # Interval display
├── url/              # Clickable link (truncated)
└── uuid/             # Shortened UUID
```

#### 4. Filter Fields (`filter-fields/`)
**Purpose:** Search/filter inputs for table data
**Base Component:** `BaseFilterFieldComponent`
**Key Features:**
- Specialized for filtering operations
- Supports comparison operators (equals, contains, greater than, etc.)
- `@Output() onFieldChange` for filter updates
- Auto-focus support for better UX

**Available Components:**
```
frontend/src/app/components/ui-components/filter-fields/
├── boolean/          # Boolean filter (true/false/all)
├── country/          # Country filter dropdown
├── date/             # Date range picker
├── date-time/        # Datetime range picker
├── file/             # File type filter
├── foreign-key/      # Related record filter
├── id/               # ID search
├── json-editor/      # JSON query filter
├── long-text/        # Text search with operators
├── number/           # Numeric range filter
├── password/         # Password field filter
├── point/            # Geographic filter
├── select/           # Dropdown filter
├── static-text/      # Text filter
├── text/             # Text search input
├── time/             # Time range filter
└── time-interval/    # Interval filter
```

**Widget Registration:**
- `frontend/src/app/consts/record-edit-types.ts` - Maps widget types to Angular components

**Widget Configuration UI:**
- `frontend/src/app/components/dashboard/db-table-view/db-table-widgets/` - UI for managing widgets

### Shared Code

**Data Structures:**
- `shared-code/src/data-access-layer/shared/data-structures/table-widget.ds.ts`
- `shared-code/src/data-access-layer/shared/enums/table-widget-type.enum.ts`

---

## Widget Structure

### Database Schema

```typescript
@Entity('table_widget')
export class TableWidgetEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;                        // Unique identifier

  @Column()
  field_name: string;                // Database column name

  @Column({ default: null, type: 'varchar' })
  widget_type?: WidgetTypeEnum;      // Widget type (e.g., 'Boolean', 'Date')

  @Column('json', { default: null })
  widget_params: string;             // JSON configuration parameters

  @Column('json', { default: null })
  widget_options: string;            // JSON options

  @Column({ default: null })
  name?: string;                     // Display name

  @Column({ default: null })
  description?: string;              // Widget description

  @ManyToOne(() => TableSettingsEntity)
  settings: Relation<TableSettingsEntity>;
}
```

### API Endpoints

- `GET /widgets/:connectionId?tableName={tableName}` - Fetch widgets for a table
- `POST /widget/:connectionId?tableName={tableName}` - Create/update widgets

---

## Available Widget Types

Currently supported widget types (24 total):

| Widget Type | Description | Common Parameters |
|------------|-------------|-------------------|
| `Boolean` | Checkbox for true/false values | N/A |
| `Code` | Syntax-highlighted code editor | `language`, `theme` |
| `Color` | Color picker | N/A |
| `Country` | Country selector with flags | N/A |
| `Date` | Date picker (YYYY-MM-DD) | `format` |
| `DateTime` | Date and time picker | `format` |
| `Enum` | Dropdown for enum values | `enum_values` |
| `File` | File upload/download | `max_size`, `allowed_types` |
| `Foreign_key` | Related record selector | `referenced_table_name`, `referenced_column_name` |
| `Image` | Image upload/display | `height`, `prefix` |
| `JSON` | JSON editor | N/A |
| `Number` | Numeric input | `unit`, `threshold_min`, `threshold_max` |
| `Password` | Password input with encryption | `encrypt`, `algorithm` |
| `Phone` | Phone number input | `country_code` |
| `Range` | Range slider | `min`, `max`, `step` |
| `Readonly` | Read-only text display | N/A |
| `Select` | Dropdown selector | `options`, `allow_null` |
| `String` | Single-line text input | `pattern` |
| `Textarea` | Multi-line text input | `rows`, `cols` |
| `Time` | Time picker (HH:MM:SS) | `format` |
| `Timezone` | Timezone selector with UTC offsets | `allow_null` |
| `URL` | URL input with validation | N/A |
| `UUID` | UUID display/input | N/A |
| `Default` | Default rendering (inferred) | N/A |

---

## How to Add a New Widget

### Prerequisites

Before adding a new widget, consider:
1. Is there an existing widget type that can be configured to meet your needs?
2. What database column types will this widget support?
3. What parameters does the widget need?

### Step 1: Add Widget Type to Enum

**File:** `backend/src/enums/widget-type.enum.ts`

```typescript
export enum WidgetTypeEnum {
  // ... existing types
  YOUR_NEW_WIDGET = 'Your_new_widget',
}
```

### Step 2: Create Frontend Components

When adding a new widget, you need to create components for **all four contexts**:

1. **Record Edit Field** (required) - `record-edit-fields/your-new-widget/`
2. **Record View Field** (optional) - `record-view-fields/your-new-widget/`
3. **Table Display Field** (optional) - `table-display-fields/your-new-widget/`
4. **Filter Field** (optional) - `filter-fields/your-new-widget/`

**Note:** At minimum, create the **record-edit-field** component. The other contexts will fall back to default rendering if not provided.

#### Creating the Record Edit Field Component

**Location:** `frontend/src/app/components/ui-components/record-edit-fields/your-new-widget/`

Create three files:

#### 1. Component TypeScript (`your-new-widget.component.ts`)

```typescript
import { CUSTOM_ELEMENTS_SCHEMA, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { BaseEditFieldComponent } from '../base-row-field/base-row-field.component';

@Component({
  selector: 'app-edit-your-new-widget',
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule],
  templateUrl: './your-new-widget.component.html',
  styleUrls: ['./your-new-widget.component.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class YourNewWidgetEditComponent extends BaseEditFieldComponent {
  @Input() value: any;

  ngOnInit(): void {
    super.ngOnInit();
    // Additional initialization here
  }

  handleChange(newValue: any): void {
    this.onFieldChange.emit(newValue);
  }
}
```

#### 2. Component Template (`your-new-widget.component.html`)

```html
<mat-form-field class="your-new-widget-form-field" appearance="outline">
  <mat-label>{{normalizedLabel}}</mat-label>
  <input
    matInput
    name="{{label}}-{{key}}"
    [required]="required"
    [disabled]="disabled"
    [readonly]="readonly"
    attr.data-testid="record-{{label}}-your-new-widget"
    [(ngModel)]="value"
    (ngModelChange)="onFieldChange.emit($event)"
  />
</mat-form-field>
```

#### 3. Component Styles (`your-new-widget.component.css`)

```css
.your-new-widget-form-field {
  width: 100%;
}
```

#### Optional: Create Other Field Type Components

**Record View Field** (`record-view-fields/your-new-widget/`):
```typescript
import { Component, Input } from '@angular/core';
import { BaseRecordViewFieldComponent } from '../base-record-view-field/base-record-view-field.component';

@Component({
  selector: 'app-view-your-new-widget',
  templateUrl: './your-new-widget.component.html',
  styleUrls: ['./your-new-widget.component.css']
})
export class YourNewWidgetViewComponent extends BaseRecordViewFieldComponent {
  // Read-only display logic
}
```

**Table Display Field** (`table-display-fields/your-new-widget/`):
```typescript
import { Component } from '@angular/core';
import { BaseTableDisplayFieldComponent } from '../base-table-display-field/base-table-display-field.component';

@Component({
  selector: 'app-display-your-new-widget',
  templateUrl: './your-new-widget.component.html',
  styleUrls: ['./your-new-widget.component.css']
})
export class YourNewWidgetDisplayComponent extends BaseTableDisplayFieldComponent {
  // Condensed table display logic
}
```

**Filter Field** (`filter-fields/your-new-widget/`):
```typescript
import { Component } from '@angular/core';
import { BaseFilterFieldComponent } from '../base-filter-field/base-filter-field.component';

@Component({
  selector: 'app-filter-your-new-widget',
  templateUrl: './your-new-widget.component.html',
  styleUrls: ['./your-new-widget.component.css']
})
export class YourNewWidgetFilterComponent extends BaseFilterFieldComponent {
  // Filter logic with operators
}
```

### Step 3: Register Component (Angular Standalone)

**Note:** With Angular 19's standalone components, you don't need to register in NgModule. Components are self-contained with their imports.

### Step 4: Add to Widget Registries

You need to register your widget components in **four separate registry files**, one for each context:

#### 4.1 Record Edit Types Registry

**File:** `frontend/src/app/consts/record-edit-types.ts`

```typescript
// Add import at the top
import { YourNewWidgetEditComponent } from '../components/ui-components/record-edit-fields/your-new-widget/your-new-widget.component';

// Add to UIwidgets export
export const UIwidgets = {
  // ... existing widgets
  Your_new_widget: YourNewWidgetEditComponent,
}
```

#### 4.2 Record View Types Registry

**File:** `frontend/src/app/consts/record-view-types.ts`

```typescript
// Add import at the top
import { YourNewWidgetRecordViewComponent } from '../components/ui-components/record-view-fields/your-new-widget/your-new-widget.component';

// Add to UIwidgets export
export const UIwidgets = {
  // ... existing widgets
  Your_new_widget: YourNewWidgetRecordViewComponent,
}
```

#### 4.3 Table Display Types Registry

**File:** `frontend/src/app/consts/table-display-types.ts`

```typescript
// Add import at the top
import { YourNewWidgetDisplayComponent } from '../components/ui-components/table-display-fields/your-new-widget/your-new-widget.component';

// Add to UIwidgets export
export const UIwidgets = {
  // ... existing widgets
  Your_new_widget: YourNewWidgetDisplayComponent,
}
```

#### 4.4 Filter Types Registry

**File:** `frontend/src/app/consts/filter-types.ts`

```typescript
// Add import at the top
import { YourNewWidgetFilterComponent } from '../components/ui-components/filter-fields/your-new-widget/your-new-widget.component';

// Add to UIwidgets export
export const UIwidgets = {
  // ... existing widgets
  Your_new_widget: YourNewWidgetFilterComponent,
}
```

**Important Notes:**
- Each registry file has its own `UIwidgets` export mapping widget types to components
- If you only created the record-edit-fields component, only add it to `record-edit-types.ts`
- The system will gracefully fall back to default rendering for missing contexts
- Component names follow the pattern: `{WidgetName}{Context}Component` where Context is Edit, RecordView, Display, or Filter

### Step 5: Add Default Parameters (Optional)

**File:** `frontend/src/app/components/dashboard/db-table-view/db-table-widgets/db-table-widgets.component.ts`

Add default parameters with documentation:

```typescript
public defaultParams = {
  // ... existing defaults
  Your_new_widget: `{
    // Parameter 1 description
    "param1": "value1",

    // Parameter 2 description
    "param2": 100
  }`,
}
```

### Step 6: Add Backend Validation (Optional)

**File:** `backend/src/entities/widget/utils/validate-create-widgets-ds.ts`

If your widget requires special validation:

```typescript
async function validateCreateWidgetsDs(widgets, connection, tableName) {
  for (const widget of widgets) {
    // ... existing validations

    if (widget.widget_type === WidgetTypeEnum.YOUR_NEW_WIDGET) {
      // Validate widget-specific parameters
      const params = JSON.parse(widget.widget_params || '{}');

      if (!params.required_param) {
        throw new Error('your_new_widget requires required_param');
      }
    }
  }
}
```

### Step 7: Add Documentation

Update this file with:
1. Description of the new widget
2. Available parameters
3. Example configuration
4. Supported database types

### Step 8: Write Tests

#### Backend Test

**File:** `backend/test/ava-tests/saas-tests/table-widgets-e2e.test.ts`

```typescript
test('should create widget with YOUR_NEW_WIDGET type', async t => {
  // Arrange
  const widget = {
    field_name: 'test_field',
    widget_type: 'Your_new_widget',
    widget_params: JSON.stringify({ param1: 'value1' })
  };

  // Act
  const response = await request(app.getHttpServer())
    .post(`/widget/${connectionId}?tableName=test_table`)
    .send({ widgets: [widget] });

  // Assert
  t.is(response.status, 200);
  t.is(response.body[0].widget_type, 'Your_new_widget');
});
```

#### Frontend Test

**File:** `frontend/src/app/components/ui-components/your-new-widget-edit/your-new-widget-edit.component.spec.ts`

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { YourNewWidgetEditComponent } from './your-new-widget-edit.component';

describe('YourNewWidgetEditComponent', () => {
  let component: YourNewWidgetEditComponent;
  let fixture: ComponentFixture<YourNewWidgetEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ YourNewWidgetEditComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(YourNewWidgetEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit value on change', () => {
    spyOn(component.onFieldChange, 'emit');
    component.handleChange('new value');
    expect(component.onFieldChange.emit).toHaveBeenCalledWith('new value');
  });
});
```

---

## Widget Lifecycle

### 1. Creation
1. User navigates to **Settings > UI Widgets**
2. Selects a database field
3. Chooses widget type from dropdown
4. Configures widget parameters in JSON editor
5. Clicks **Save**

### 2. Storage
- Widget configuration saved to `table_widget` table
- `widget_params` stored as JSON string
- `widget_options` auto-stringified if needed
- Associated with table via `table_settings` relationship

### 3. Retrieval
- Widgets fetched when table is loaded
- API: `GET /widgets/:connectionId?tableName={tableName}`
- Cached in frontend service

### 4. Rendering
- When displaying/editing records:
  1. System checks if field has widget configured
  2. If yes: Instantiates corresponding Angular component
  3. Passes `field` config and `value` to component
  4. Component renders based on `widget_params`

### 5. Updates
- User modifies widget configuration
- System validates new configuration
- Updates existing widget in database
- UI refreshes with new widget behavior

### 6. Deletion
- Widget can be removed via UI
- Field becomes available for re-assignment
- Default rendering used if no widget configured

---

## Widget Parameters Examples

### Select Widget
```json
{
  "allow_null": true,
  "options": [
    {"value": "active", "label": "Active"},
    {"value": "inactive", "label": "Inactive"},
    {"value": "pending", "label": "Pending"}
  ]
}
```

### Password Widget
```json
{
  "encrypt": true,
  "algorithm": "bcrypt"
}
```

Supported algorithms: `sha1`, `sha3`, `sha224`, `sha256`, `sha512`, `sha384`, `bcrypt`, `scrypt`, `argon2`, `pbkdf2`

### Foreign Key Widget
```json
{
  "column_name": "user_id",
  "referenced_column_name": "id",
  "referenced_table_name": "users"
}
```

### Image Widget
```json
{
  "height": 100,
  "prefix": "https://cdn.example.com/images/"
}
```

### Number Widget
```json
{
  "unit": "bytes",
  "threshold_min": 0,
  "threshold_max": 1048576
}
```

### Timezone Widget
```json
{
  "allow_null": false
}
```

The Timezone widget automatically populates the dropdown with all available timezones from the Intl API, displaying them with their UTC offsets (e.g., "America/New_York (UTC-05:00)").

---

## Testing

### Backend Tests

Run backend widget tests:
```bash
cd backend
npm test table-widgets-e2e.test.ts
```

Test files:
- `backend/test/ava-tests/saas-tests/table-widgets-e2e.test.ts`
- `backend/test/ava-tests/non-saas-tests/non-saas-table-widgets-e2e.test.ts`

### Frontend Tests

Run frontend tests (from project root):
```bash
cd frontend && yarn test --browsers=ChromeHeadlessCustom --no-watch --no-progress
```

Widget component tests located in:
- `frontend/src/app/components/ui-components/record-edit-fields/*/your-widget.component.spec.ts`
- `frontend/src/app/components/ui-components/record-view-fields/*/your-widget.component.spec.ts`
- `frontend/src/app/components/ui-components/table-display-fields/*/your-widget.component.spec.ts`
- `frontend/src/app/components/ui-components/filter-fields/*/your-widget.component.spec.ts`

---

## Real-World Example: Timezone Widget

The **Timezone widget** is a complete example demonstrating all the concepts covered in this guide.

### Implementation Details

**Backend Enum** (`backend/src/enums/widget-type.enum.ts:24`):
```typescript
Timezone = 'Timezone'
```

**Frontend Component** (`record-edit-fields/timezone/timezone.component.ts`):
```typescript
import { CUSTOM_ELEMENTS_SCHEMA, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { BaseEditFieldComponent } from '../base-row-field/base-row-field.component';

@Component({
  selector: 'app-edit-timezone',
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatSelectModule],
  templateUrl: './timezone.component.html',
  styleUrls: ['./timezone.component.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class TimezoneEditComponent extends BaseEditFieldComponent {
  @Input() value: string;
  public timezones: { value: string, label: string }[] = [];

  ngOnInit(): void {
    super.ngOnInit();
    this.initializeTimezones();
  }

  private initializeTimezones(): void {
    // Get all available timezone identifiers from Intl API
    const timezoneList = Intl.supportedValuesOf('timeZone');

    // Map timezones to format with offset and readable label
    this.timezones = timezoneList.map(tz => {
      const offset = this.getTimezoneOffset(tz);
      return {
        value: tz,
        label: `${tz} (UTC${offset})`
      };
    });

    // Sort by timezone name
    this.timezones.sort((a, b) => a.value.localeCompare(b.value));

    // Add null option if allowed
    if (this.widgetStructure?.widget_params?.allow_null) {
      this.timezones = [{ value: null, label: '' }, ...this.timezones];
    }
  }

  private getTimezoneOffset(timezone: string): string {
    // Implementation details for calculating UTC offset
    // ...
  }
}
```

**Widget Registration in All Four Registries:**

1. `consts/record-edit-types.ts:57`:
```typescript
export const UIwidgets = {
  // ... other widgets
  Timezone: TimezoneEditComponent,
  // ... other widgets
}
```

2. `consts/record-view-types.ts:52`:
```typescript
export const UIwidgets = {
  // ... other widgets
  Timezone: TimezoneRecordViewComponent,
  // ... other widgets
}
```

3. `consts/table-display-types.ts:50`:
```typescript
export const UIwidgets = {
  // ... other widgets
  Timezone: TimezoneDisplayComponent,
  // ... other widgets
}
```

4. `consts/filter-types.ts:38`:
```typescript
export const UIwidgets = {
  // ... other widgets
  Timezone: TimezoneFilterComponent,
  // ... other widgets
}
```

**Default Parameters** (`db-table-widgets.component.ts:249-255`):
```typescript
Timezone: `// Configure timezone widget options
// Uses Intl API to populate timezone list automatically
// allow_null: Allow empty/null value selection
{
  "allow_null": false
}
`,
```

**Key Features:**
- Uses browser's Intl API (`Intl.supportedValuesOf('timeZone')`)
- Automatically calculates UTC offsets for each timezone
- Supports `allow_null` parameter
- Material Design dropdown with search capability
- Alphabetically sorted timezone list
- Comprehensive test coverage

**Component Files (All Four Contexts):**

**Record Edit Fields:**
- Component: `frontend/src/app/components/ui-components/record-edit-fields/timezone/timezone.component.ts`
- Template: `frontend/src/app/components/ui-components/record-edit-fields/timezone/timezone.component.html`
- Styles: `frontend/src/app/components/ui-components/record-edit-fields/timezone/timezone.component.css`
- Tests: `frontend/src/app/components/ui-components/record-edit-fields/timezone/timezone.component.spec.ts`

**Record View Fields:**
- Component: `frontend/src/app/components/ui-components/record-view-fields/timezone/timezone.component.ts`
- Template: `frontend/src/app/components/ui-components/record-view-fields/timezone/timezone.component.html`
- Styles: `frontend/src/app/components/ui-components/record-view-fields/timezone/timezone.component.css`
- Tests: `frontend/src/app/components/ui-components/record-view-fields/timezone/timezone.component.spec.ts`

**Table Display Fields:**
- Component: `frontend/src/app/components/ui-components/table-display-fields/timezone/timezone.component.ts`
- Template: `frontend/src/app/components/ui-components/table-display-fields/timezone/timezone.component.html`
- Styles: `frontend/src/app/components/ui-components/table-display-fields/timezone/timezone.component.css`
- Tests: `frontend/src/app/components/ui-components/table-display-fields/timezone/timezone.component.spec.ts`

**Filter Fields:**
- Component: `frontend/src/app/components/ui-components/filter-fields/timezone/timezone.component.ts`
- Template: `frontend/src/app/components/ui-components/filter-fields/timezone/timezone.component.html`
- Styles: `frontend/src/app/components/ui-components/filter-fields/timezone/timezone.component.css`
- Tests: `frontend/src/app/components/ui-components/filter-fields/timezone/timezone.component.spec.ts`

**Registry Files:**
- `frontend/src/app/consts/record-edit-types.ts` (line 25, 57)
- `frontend/src/app/consts/record-view-types.ts` (line 24, 52)
- `frontend/src/app/consts/table-display-types.ts` (line 24, 50)
- `frontend/src/app/consts/filter-types.ts` (line 19, 38)

---

## Important Notes

1. **Four Field Contexts:** Understanding when each field type is used:
   - **Record Edit Fields:** Used in create/edit forms (modals, dedicated edit pages)
   - **Record View Fields:** Used in single record detail/view pages (read-only)
   - **Table Display Fields:** Used in table rows for listing multiple records (compact display)
   - **Filter Fields:** Used in filter panels for searching/filtering table data

2. **Component Inheritance:** All field components should extend their respective base components:
   - `BaseEditFieldComponent` for record-edit-fields
   - `BaseRecordViewFieldComponent` for record-view-fields
   - `BaseTableDisplayFieldComponent` for table-display-fields
   - `BaseFilterFieldComponent` for filter-fields

3. **Standalone Architecture:** Angular 19 uses standalone components. No NgModule registration needed. Import dependencies directly in component metadata.

4. **JSON5 Support:** Widget parameters support JSON5 format (comments, unquoted keys) in the UI editor, but are stored as standard JSON

5. **Security:** Widget parameters are parsed using `secure-json-parse` to prevent prototype pollution attacks

6. **Validation:** Always validate widget parameters both on frontend (user experience) and backend (security)

7. **Database Types:** Consider which database column types are compatible with your widget

8. **Cascading Deletes:** Widgets are automatically deleted when their parent `table_settings` record is removed

9. **Null Values:** Widget type can be null (defaults to standard rendering)

10. **Progressive Enhancement:** Start with the record-edit-field component. Add view/display/filter components only if you need custom behavior for those contexts

---

## Key Files Reference

### Backend
- Entity: `backend/src/entities/widget/table-widget.entity.ts`
- Controller: `backend/src/entities/widget/table-widget.controller.ts`
- Module: `backend/src/entities/widget/table-widget.module.ts`
- Validation: `backend/src/entities/widget/utils/validate-create-widgets-ds.ts`
- Use Cases: `backend/src/entities/widget/use-cases/`

### Frontend

**Widget Registries (Type to Component Mapping):**
- `frontend/src/app/consts/record-edit-types.ts` - Edit form components
- `frontend/src/app/consts/record-view-types.ts` - Detail view components
- `frontend/src/app/consts/table-display-types.ts` - Table row components
- `frontend/src/app/consts/filter-types.ts` - Filter panel components

**Widget Configuration:**
- **Widget Manager:** `frontend/src/app/components/dashboard/db-table-view/db-table-widgets/` - Configuration UI
- **Service:** `frontend/src/app/services/tables.service.ts` - Widget CRUD operations

**Component Directories:**
- **Record Edit Fields:** `frontend/src/app/components/ui-components/record-edit-fields/` - Interactive form inputs
- **Record View Fields:** `frontend/src/app/components/ui-components/record-view-fields/` - Read-only detail display
- **Table Display Fields:** `frontend/src/app/components/ui-components/table-display-fields/` - Compact table display
- **Filter Fields:** `frontend/src/app/components/ui-components/filter-fields/` - Search/filter inputs

### Shared
- Data Structures: `shared-code/src/data-access-layer/shared/data-structures/table-widget.ds.ts`
- Enums: `shared-code/src/data-access-layer/shared/enums/table-widget-type.enum.ts`

---

## Support

For questions or issues related to widgets:
1. Check existing widget implementations for reference
2. Review E2E tests for usage examples
3. Consult the backend validation logic for parameter requirements
4. Open an issue on the project repository

---

**Last Updated:** 2025-11-07
