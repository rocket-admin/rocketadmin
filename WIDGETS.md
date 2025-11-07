# Widget System Documentation

## Overview

The widget system in RocketAdmin allows customization of how database fields are displayed and edited in the UI. Each field in a database table can be assigned a specific widget type with custom parameters to control its behavior and appearance.

## Table of Contents

1. [Where Widgets Are Stored](#where-widgets-are-stored)
2. [Widget Structure](#widget-structure)
3. [Available Widget Types](#available-widget-types)
4. [How to Add a New Widget](#how-to-add-a-new-widget)
5. [Widget Lifecycle](#widget-lifecycle)
6. [Testing](#testing)

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

**Widget Components:**
```
frontend/src/app/components/ui-components/
├── boolean-edit/
├── code-edit/
├── color-edit/
├── country-edit/
├── date-edit/
├── datetime-edit/
├── file-edit/
├── foreign-key-edit/
├── image-edit/
├── json-editor-edit/
├── number-edit/
├── password-edit/
├── phone-edit/
├── range-edit/
├── readonly-edit/
├── select-edit/
├── string-edit/
├── textarea-edit/
├── time-edit/
├── url-edit/
└── uuid-edit/
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

Currently supported widget types (23 total):

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

### Step 2: Create Frontend Component

**Location:** `frontend/src/app/components/ui-components/your-new-widget-edit/`

Create three files:

#### 1. Component TypeScript (`your-new-widget-edit.component.ts`)

```typescript
import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-your-new-widget-edit',
  templateUrl: './your-new-widget-edit.component.html',
  styleUrls: ['./your-new-widget-edit.component.css']
})
export class YourNewWidgetEditComponent implements OnInit {
  @Input() field: any;           // Field configuration
  @Input() value: any;           // Current field value
  @Output() onFieldChange = new EventEmitter();

  ngOnInit(): void {
    // Initialize component
  }

  handleChange(newValue: any): void {
    this.onFieldChange.emit(newValue);
  }
}
```

#### 2. Component Template (`your-new-widget-edit.component.html`)

```html
<div class="your-new-widget-wrapper">
  <!-- Your widget UI here -->
  <input
    [value]="value"
    (change)="handleChange($event.target.value)"
    [attr.required]="field.required"
  />
</div>
```

#### 3. Component Styles (`your-new-widget-edit.component.css`)

```css
.your-new-widget-wrapper {
  /* Your styles here */
}
```

### Step 3: Register Component in Module

**File:** `frontend/src/app/app.module.ts`

```typescript
import { YourNewWidgetEditComponent } from './components/ui-components/your-new-widget-edit/your-new-widget-edit.component';

@NgModule({
  declarations: [
    // ... existing components
    YourNewWidgetEditComponent,
  ],
  // ...
})
export class AppModule { }
```

### Step 4: Add to Widget Registry

**File:** `frontend/src/app/consts/record-edit-types.ts`

```typescript
import { YourNewWidgetEditComponent } from '../components/ui-components/your-new-widget-edit/your-new-widget-edit.component';

export const UIwidgets = {
  // ... existing widgets
  Your_new_widget: YourNewWidgetEditComponent,
}
```

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
- `frontend/src/app/components/ui-components/*/your-widget-edit.component.spec.ts`

---

## Important Notes

1. **JSON5 Support:** Widget parameters support JSON5 format (comments, unquoted keys) in the UI editor, but are stored as standard JSON

2. **Security:** Widget parameters are parsed using `secure-json-parse` to prevent prototype pollution attacks

3. **Validation:** Always validate widget parameters both on frontend (user experience) and backend (security)

4. **Database Types:** Consider which database column types are compatible with your widget

5. **Cascading Deletes:** Widgets are automatically deleted when their parent `table_settings` record is removed

6. **Null Values:** Widget type can be null (defaults to standard rendering)

---

## Key Files Reference

### Backend
- Entity: `backend/src/entities/widget/table-widget.entity.ts`
- Controller: `backend/src/entities/widget/table-widget.controller.ts`
- Module: `backend/src/entities/widget/table-widget.module.ts`
- Validation: `backend/src/entities/widget/utils/validate-create-widgets-ds.ts`
- Use Cases: `backend/src/entities/widget/use-cases/`

### Frontend
- Registry: `frontend/src/app/consts/record-edit-types.ts`
- Widget Manager: `frontend/src/app/components/dashboard/db-table-view/db-table-widgets/`
- Components: `frontend/src/app/components/ui-components/`
- Service: `frontend/src/app/services/tables.service.ts`

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
