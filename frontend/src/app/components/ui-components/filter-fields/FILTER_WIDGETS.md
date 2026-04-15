# Filter Widget Architecture

## Directory

All filter components live under `filter-fields/`. Each has: `*.component.ts`, `*.component.html`, `*.component.css`, `*.component.spec.ts`.

## Base Class

`base-filter-field/base-filter-field.component.ts`

Signal-based inputs and outputs every filter inherits:

**Inputs:** `key`, `label`, `required`, `readonly`, `structure` (TableField), `disabled`, `widgetStructure`, `relations` (TableForeignKey), `autofocus`

**Outputs:** `onFieldChange` (emits filter value), `onComparatorChange` (emits comparator string)

**Computed:** `normalizedLabel` — human-readable field name

## Two Types of Filter Components

### 1. Simple filters (dialog manages comparator)

Set `static type` to control which comparator dropdown the dialog shows:

- `static type = 'text'` → dialog shows: startswith, endswith, eq, contains, icontains, empty
- `static type = 'number'` or `'datetime'` → dialog shows: eq, gt, lt, gte, lte
- No `static type` (or undefined) → `nonComparable`, dialog shows NO comparator

The component only emits `onFieldChange`. The dialog renders its own `<mat-select>` for the comparator.

**Examples:** `TextFilterComponent`, `NumberFilterComponent`, `DateFilterComponent`

### 2. Smart filters (component manages its own comparator)

Do NOT set `static type` — this makes `getComparatorType()` return `'nonComparable'`, so the dialog renders only the component with no external comparator dropdown.

The component has an internal `filterMode` property, renders its own `<mat-select>` for mode selection, and emits BOTH `onFieldChange` (value) and `onComparatorChange` (comparator) to the dialog.

**Examples:** `EmailFilterComponent`, `PhoneFilterComponent`, `DateTimeFilterComponent`

## Comparator Routing Logic

In `db-table-filters-dialog.component.ts` (and `saved-filters-panel`):

```
getInputType(field) → reads ComponentClass.type (static property)
getComparatorType(type):
  'text'              → dialog shows text comparators
  'number'/'datetime' → dialog shows number comparators
  anything else       → 'nonComparable' → dialog shows nothing, component manages itself
```

## Registration

### In `consts/filter-types.ts`:

- `UIwidgets` object: maps widget type names → component classes (e.g., `DateTime: DateTimeFilterComponent`)
- `filterTypes` object: maps database column types → component classes per database (e.g., `postgres['timestamp without time zone']: DateTimeFilterComponent`)

### In `db-table-filters-dialog`:

- `UIwidgets` from `filter-types.ts` merged with `record-edit-types.ts`
- Widget-based fields use `UIwidgets[widget_type]`
- Database-type fields use `filterTypes[connectionType][columnType]`

## Data Flow

1. User adds filter → dialog creates entry in `tableRowFieldsShown[field]` and `tableRowFieldsComparator[field]` (default: `'eq'`)
2. `ndc-dynamic` renders the component with inputs (`value`, `key`, `label`, etc.) and output handlers (`onFieldChange` → `updateField`, `onComparatorChange` → `updateComparatorFromComponent`)
3. Component emits value/comparator → dialog stores them
4. User clicks "Filter" → dialog closes → filters encoded as JsonURL in URL query params → table refetches

## Filter Data Format

URL: `?filters=<JsonURL-encoded>` where filters = `{ fieldName: { comparator: value } }`

Example: `{ created_at: { gte: "2024-01-01T00:00:00Z" }, email: { endswith: "@gmail.com" } }`

---

# How to Create a New Filter Widget

## Step 1: Create Component Files

Create directory: `filter-fields/<widget-name>/`

### TypeScript (`<widget-name>.component.ts`)

```typescript
import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';       // only for smart filters
import { BaseFilterFieldComponent } from '../base-filter-field/base-filter-field.component';

@Component({
  selector: 'app-filter-<widget-name>',
  templateUrl: './<widget-name>.component.html',
  styleUrls: ['./<widget-name>.component.css'],
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule],
})
export class <WidgetName>FilterComponent extends BaseFilterFieldComponent implements OnInit, AfterViewInit {
  @Input() value: any;
  @ViewChild('inputElement') inputElement: ElementRef<HTMLInputElement>;

  // For SIMPLE filter: set static type
  // static type = 'text';  // or 'number' or 'datetime'

  // For SMART filter: do NOT set static type, add filterMode instead
  public filterMode: string = 'eq';

  ngOnInit(): void {
    // Parse this.value if restoring from URL
  }

  ngAfterViewInit(): void {
    // Emit initial comparator (smart filters only)
    this.onComparatorChange.emit(this.filterMode);

    // Autofocus support
    if (this.autofocus() && this.inputElement) {
      setTimeout(() => this.inputElement.nativeElement.focus(), 100);
    }
  }

  // Smart filter: handle mode changes
  onFilterModeChange(mode: string): void {
    this.filterMode = mode;
    this.onComparatorChange.emit(mode);  // or map to backend comparator
    this.onFieldChange.emit(this.value);
  }

  // Handle value changes
  onValueChange(val: any): void {
    this.value = val;
    this.onFieldChange.emit(this.value);
    this.onComparatorChange.emit(this.filterMode);  // smart filter only
  }
}
```

### Template (`<widget-name>.component.html`)

**Simple filter** — just a value input:

```html
<mat-form-field appearance="outline">
  <mat-label>{{normalizedLabel()}}</mat-label>
  <input matInput [(ngModel)]="value" (ngModelChange)="onFieldChange.emit($event)">
</mat-form-field>
```

**Smart filter** — mode selector + conditional input:

```html
<div class="filter-row">
  <mat-form-field class="comparator-field" appearance="outline">
    <mat-select [(ngModel)]="filterMode" (ngModelChange)="onFilterModeChange($event)">
      <mat-option value="eq">equal</mat-option>
      <!-- more options -->
    </mat-select>
  </mat-form-field>

  @if (filterMode !== 'some_special_mode') {
    <mat-form-field class="value-field" appearance="outline">
      <mat-label>{{normalizedLabel()}}</mat-label>
      <input matInput #inputElement
        [required]="required()" [disabled]="disabled()" [readonly]="readonly()"
        [(ngModel)]="value" (ngModelChange)="onValueChange($event)">
    </mat-form-field>
  }
</div>
```

### CSS (`<widget-name>.component.css`)

**Smart filter layout** (reuse across all smart filters):

```css
.filter-row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  width: 100%;
}
.comparator-field {
  flex: 0 0 auto;
  min-width: 150px;
}
.value-field {
  flex: 1;
}
```

## Step 2: Register the Component

In `consts/filter-types.ts`:

1. Import the component
2. Add to `UIwidgets` object if it's a custom widget type:
   ```typescript
   export const UIwidgets = {
     // ...existing...
     MyWidget: MyWidgetFilterComponent,
   };
   ```
3. Add to `filterTypes` database mappings if it maps to a database column type:
   ```typescript
   postgres: {
     my_column_type: MyWidgetFilterComponent,
   },
   ```

## Step 3: Write Tests

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('<WidgetName>FilterComponent', () => {
  let component: <WidgetName>FilterComponent;
  let fixture: ComponentFixture<<WidgetName>FilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [<WidgetName>FilterComponent, BrowserAnimationsModule],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(<WidgetName>FilterComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  // Test value emission
  // Test comparator emission (smart filters)
  // Test URL restoration (ngOnInit with existing value)
  // Test mode switching (smart filters)
});
```

**Note:** Tests use Vitest (`vi.spyOn`), not Jasmine. Use `toBe(true)` not `toBeTrue()`.

## Key Gotchas

- **Do NOT override `onFieldChange` or `onComparatorChange`** — the base class outputs work fine. Overriding creates a shadowed emitter.
- **Comparator mapping**: internal filter modes can differ from backend comparators. Email's `'domain'` mode emits `'endswith'`; phone's `'country'` mode emits `'startswith'`.
- **URL restoration**: when restoring from URL, you can't distinguish preset modes from custom ones — default to showing as a custom comparator.
- **Timezone**: for datetime values, use `toISOString()` for genuine UTC. Never use `format()` with literal `'Z'` suffix — it outputs local time with a fake UTC marker.
- **`fixture.detectChanges()`**: move it out of `beforeEach` if your component emits in `ngAfterViewInit` — call it only in tests that need the full lifecycle.
