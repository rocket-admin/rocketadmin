# Widget System Documentation

## Overview

The widget system in RocketAdmin allows customization of how database fields are displayed and edited in the UI. Each field in a database table can be assigned a specific widget type with custom parameters to control its behavior and appearance.

### Widget Contexts

Widgets are implemented across **four different contexts**, each serving a specific purpose in the UI:

| Context | Location | Purpose | Editable | Composable |
|---------|----------|---------|----------|------------|
| **Record Edit Fields** | Create/Edit forms | Interactive input for data entry | ✅ Yes | `useRecordEditField(props)` |
| **Record View Fields** | Single record detail page | Read-only formatted display | ❌ No | `useViewField(props, emit)` |
| **Table Display Fields** | Table rows | Compact display in lists | ❌ No | `useViewField(props, emit)` |
| **Filter Fields** | Filter panels | Search and filter inputs | ✅ Yes | `useFilterField(props)` (an alias of `useRecordEditField`) |

All four composables live in `frontend/src/components/fields/useFieldWidget.ts`.

**Example:** The `Boolean` widget type has four implementations under `frontend/src/components/fields/`:
- `record-edit/BooleanEdit.vue` - Checkbox toggle for editing
- `record-view/BooleanRecordView.vue` - "Yes/No" or icon display
- `table-display/BooleanDisplay.vue` - Badge or icon in table cells
- `filter/BooleanFilter.vue` - True/False/All dropdown for filtering

## Table of Contents

1. [Where Widgets Are Stored](#where-widgets-are-stored)
   - [Backend (Database & Entity)](#backend-database--entity)
   - [Frontend (UI Components)](#frontend-ui-components)
     - [Record Edit Fields](#1-record-edit-fields-record-edit-editvue)
     - [Record View Fields](#2-record-view-fields-record-view-recordviewvue)
     - [Table Display Fields](#3-table-display-fields-table-display-displayvue)
     - [Filter Fields](#4-filter-fields-filter-filtervue)
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

The frontend (Vue 3, `frontend/`) implements widgets in **four contexts**. Each one is a folder of single-file components under `frontend/src/components/fields/`, named `<Widget><Suffix>.vue`. The props they share (`label`, `value`, `fieldKey`, `structure`, `widgetStructure`, `relations`, `readonly`, `required`, `disabled`) are defined in `fields/types.ts`. Their common logic lives in the composables in `fields/useFieldWidget.ts`.

#### 1. Record Edit Fields (`record-edit/`, `*Edit.vue`)
**Purpose:** Interactive form inputs for editing and creating records.
**Composable:** `useRecordEditField(props)`
**Key Features:**
- Emit `fieldChange` with the new value.
- Support validation and the required, disabled and readonly states.

**Widgets:** Binary, BinaryDataCaption, Boolean, Code, Color, Country, Date, DateTime, File, ForeignKey, Id, Image, JsonEditor, Language, LongText, Markdown, Money, Number, Password, Phone, Point, Range, S3, Select, StaticText, Text, Time, TimeInterval, Timezone, Url, Uuid

#### 2. Record View Fields (`record-view/`, `*RecordView.vue`)
**Purpose:** Read-only display for the single-record detail view.
**Composable:** `useViewField(props, emit)`
**Key Features:**
- Display only, no editing.
- Copy to clipboard, which emits `copyToClipboard`.
- Present formatted values.

**Widgets:** the same set as Record Edit. `RecordViewValue.vue` picks the widget for a field.

#### 3. Table Display Fields (`table-display/`, `*Display.vue`)
**Purpose:** Compact, read-only display in table rows.
**Composable:** `useViewField(props, emit)`
**Key Features:**
- Condensed display for tables, with long values truncated.
- Copy to clipboard.

**Widgets:** the same set as Record Edit. `TableDisplayCell.vue` picks the widget for a cell.

#### 4. Filter Fields (`filter/`, `*Filter.vue`)
**Purpose:** Search and filter inputs for table data.
**Composable:** `useFilterField(props)`
**Key Features:**
- Comparison operators (equals, contains, greater than, ...), which emit `comparatorChange`.
- Emit `fieldChange` when the filter value changes.
- Autofocus support.

**Widgets:** Binary, BinaryDataCaption, Boolean, Country, Date, DateTime, Default, Email, File, ForeignKey, Id, JsonEditor, LongText, Number, Password, Phone, Point, Select, StaticText, Text, Time, TimeInterval, Timezone. `FilterComparatorRow.vue` lays out the comparator next to the input.

**Widget Registration:**
- `frontend/src/consts/record-edit-types.ts`, `record-view-types.ts`, `table-display-types.ts` and `filter-types.ts` map widget types and DB types to components (`defineAsyncComponent`). `frontend/src/consts/widget-types.spec.ts` checks these maps against a snapshot of the old Angular maps.

**Widget Configuration UI:**
- `frontend/src/views/table/TableWidgetsView.vue` with `frontend/src/components/table/TableWidgetItem.vue` and `widget-defaults.ts`.

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

When adding a new widget, you need to create components for **all four contexts**, under `frontend/src/components/fields/`:

1. **Record Edit Field** (required) - `record-edit/YourNewWidgetEdit.vue`
2. **Record View Field** (optional) - `record-view/YourNewWidgetRecordView.vue`
3. **Table Display Field** (optional) - `table-display/YourNewWidgetDisplay.vue`
4. **Filter Field** (optional) - `filter/YourNewWidgetFilter.vue`

**Note:** At minimum, create the **record-edit** component. The other contexts will fall back to default rendering if not provided.

Every widget is a `<script setup lang="ts">` single-file component. Next to it go a `*.spec.ts` (Vitest) and a `*.stories.ts` (Storybook), like the existing widgets. Build the markup from the primitives in `@/components/ui` (`UiField`, `UiInput`, `UiSelect`, ...). Keep styles `scoped`, BEM-named, and use only the `--color-*` (and spacing/text) CSS variables, so the dark theme works.

#### Creating the Record Edit Field Component

**File:** `frontend/src/components/fields/record-edit/YourNewWidgetEdit.vue`

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { UiField, UiInput } from '@/components/ui';
import type { RecordEditFieldEmits, RecordEditFieldProps } from '../types';
import { useRecordEditField } from '../useFieldWidget';

const props = defineProps<RecordEditFieldProps & { value?: string | null }>();
const emit = defineEmits<RecordEditFieldEmits>();

const { normalizedLabel, widgetParams } = useRecordEditField(props);

const text = ref(props.value ?? '');

function onInput(value: string) {
	text.value = value;
	emit('fieldChange', value);
}
</script>

<template>
	<UiField class="your-new-widget-edit" :label="normalizedLabel" :required="required">
		<UiInput
			:name="`${label}-${fieldKey}`"
			:model-value="text"
			:disabled="disabled"
			:readonly="readonly"
			:data-testid="`record-${label}-your-new-widget`"
			@update:model-value="onInput"
		/>
	</UiField>
</template>

<style scoped>
.your-new-widget-edit {
  width: 100%;
}
</style>
```

The shared props (`fieldKey`, `label`, `required`, `readonly`, `disabled`, `structure`, `widgetStructure`, `relations`) come from `RecordEditFieldProps` in `fields/types.ts`; each widget adds its own typed `value`. Note that the field key is `fieldKey` (`key` is reserved in Vue), and the output is the `fieldChange` event. `widgetParams` is the parsed `widget_params` object, whether the API sent it as a string or an object.

#### Optional: Create Other Field Type Components

**Record View Field** (`record-view/YourNewWidgetRecordView.vue`):
```vue
<script setup lang="ts">
import type { RecordViewFieldProps, ViewFieldEmits } from '../types';
import RecordViewValue from './RecordViewValue.vue';

defineProps<RecordViewFieldProps & { value?: string | null }>();
defineEmits<ViewFieldEmits>();
</script>

<template>
	<RecordViewValue>{{ value || '—' }}</RecordViewValue>
</template>
```

**Table Display Field** (`table-display/YourNewWidgetDisplay.vue`):
```vue
<script setup lang="ts">
import type { TableDisplayFieldProps, ViewFieldEmits } from '../types';
import { useViewField } from '../useFieldWidget';
import TableDisplayCell from './TableDisplayCell.vue';

const props = defineProps<TableDisplayFieldProps & { value?: string | null }>();
const emit = defineEmits<ViewFieldEmits>();

// `copy()` copies the value and emits `copyToClipboard` with the snackbar message.
const { copy } = useViewField(props, emit);
</script>

<template>
	<TableDisplayCell @copy="copy(value)">{{ value || '—' }}</TableDisplayCell>
</template>
```

**Filter Field** (`filter/YourNewWidgetFilter.vue`):
```vue
<script setup lang="ts">
import { ref } from 'vue';
import { UiField, UiInput } from '@/components/ui';
import type { FilterFieldEmits, FilterFieldProps } from '../types';
import { useFilterField } from '../useFieldWidget';
import { type FocusTarget, useAutofocus } from './useAutofocus';

const props = defineProps<FilterFieldProps & { value?: string | null }>();
const emit = defineEmits<FilterFieldEmits>();

const { normalizedLabel } = useFilterField(props);

const input = ref<FocusTarget>(null);
useAutofocus(props, input);
</script>

<template>
	<UiField floating-label :label="normalizedLabel">
		<UiInput
			ref="input"
			:name="`${label}-${fieldKey}`"
			:model-value="value ?? ''"
			:data-testid="`filter-${label}-your-new-widget`"
			@update:model-value="emit('fieldChange', $event)"
		/>
	</UiField>
</template>
```

A filter widget that picks its own comparator (`eq`, `contains`, `startswith`, `empty`, ...) emits `comparatorChange` as well.

### Step 3: Add to Widget Registries

You need to register your widget components in **four separate registry files** under `frontend/src/consts/`, one for each context. Each file declares the components as lazily loaded `defineAsyncComponent(() => import(...))` constants and maps widget types to them in its `UIwidgets` export:

#### 3.1 Record Edit Types Registry

**File:** `frontend/src/consts/record-edit-types.ts`

```typescript
const YourNewWidgetEdit = defineAsyncComponent(() => import('@/components/fields/record-edit/YourNewWidgetEdit.vue'));

export const UIwidgets = {
	// ... existing widgets
	Your_new_widget: YourNewWidgetEdit,
};
```

The keys of this map also fill the widget type dropdown on the widgets settings page.

#### 3.2 Record View Types Registry

**File:** `frontend/src/consts/record-view-types.ts`

```typescript
const YourNewWidgetRecordView = defineAsyncComponent(
	() => import('@/components/fields/record-view/YourNewWidgetRecordView.vue'),
);

export const UIwidgets = {
	// ... existing widgets
	Your_new_widget: YourNewWidgetRecordView,
};
```

#### 3.3 Table Display Types Registry

**File:** `frontend/src/consts/table-display-types.ts`

```typescript
const YourNewWidgetDisplay = defineAsyncComponent(() => import('@/components/fields/table-display/YourNewWidgetDisplay.vue'));

export const UIwidgets = {
	// ... existing widgets
	Your_new_widget: YourNewWidgetDisplay,
};
```

#### 3.4 Filter Types Registry

**File:** `frontend/src/consts/filter-types.ts`

```typescript
const YourNewWidgetFilter = defineAsyncComponent(() => import('@/components/fields/filter/YourNewWidgetFilter.vue'));

export const UIwidgets = {
	// ... existing widgets
	Your_new_widget: YourNewWidgetFilter,
};
```

#### 3.5 Update the Registry Snapshot

`frontend/src/consts/widget-types.spec.ts` compares every map in these four files against `frontend/src/consts/widget-types.angular.json`, a frozen snapshot of the old Angular maps (each entry is the SFC name, e.g. `"Timezone": "TimezoneEdit"`). A new entry fails that test until you add it to the JSON too:

```json
{
	"record-edit-types.ts": {
		"UIwidgets": {
			"Your_new_widget": "YourNewWidgetEdit"
		}
	}
}
```

Add the matching entry under `record-view-types.ts`, `table-display-types.ts` and `filter-types.ts` for each context you registered.

**Important Notes:**
- Each registry file has its own `UIwidgets` export mapping widget types to components
- The same files also hold the DB-type maps (`recordEditTypes`, `recordViewFieldTypes`, `tableDisplayTypes`, `filterTypes`) used for columns without a widget
- If you only created the record-edit component, only add it to `record-edit-types.ts`
- The system will gracefully fall back to default rendering for missing contexts
- Component names follow the pattern: `{WidgetName}{Context}.vue` where Context is Edit, RecordView, Display, or Filter

### Step 4: Add Default Parameters (Optional)

**File:** `frontend/src/components/table/widget-defaults.ts`

Add default parameters with documentation to `WIDGET_DEFAULT_PARAMS`. This is the JSON5 text the params editor starts with when the widget type is picked. A type whose default is `NO_SETTINGS` gets a read-only editor. You can also add a docs link to `WIDGET_DOCS_URLS`.

```typescript
export const WIDGET_DEFAULT_PARAMS: Record<string, string> = {
	// ... existing defaults
	Your_new_widget: `// Parameter 1 description
// Parameter 2 description
{
  "param1": "value1",
  "param2": 100
}
`,
};
```

### Step 5: Add Backend Validation (Optional)

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

### Step 6: Add Documentation

Update this file with:
1. Description of the new widget
2. Available parameters
3. Example configuration
4. Supported database types

### Step 7: Write Tests

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

**File:** `frontend/src/components/fields/record-edit/YourNewWidgetEdit.spec.ts`

```typescript
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { mockWidgetStructure } from '../stories.mocks';
import YourNewWidgetEdit from './YourNewWidgetEdit.vue';

describe('YourNewWidgetEdit', () => {
	it('renders the value', () => {
		const wrapper = mount(YourNewWidgetEdit, { props: { label: 'field', value: 'hello' } });
		expect(wrapper.find('input').element.value).toBe('hello');
	});

	it('emits fieldChange on input', async () => {
		const wrapper = mount(YourNewWidgetEdit, {
			props: { label: 'field', widgetStructure: mockWidgetStructure({ param1: 'value1' }) },
		});
		await wrapper.find('[data-testid="record-field-your-new-widget"]').setValue('new value');
		expect(wrapper.emitted('fieldChange')).toEqual([['new value']]);
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
- Cached in the frontend tables store (`stores/tables.ts`)

### 4. Rendering
- When displaying/editing records:
  1. System checks if field has widget configured
  2. If yes: Renders the Vue component registered for its `widget_type` in that context's `UIwidgets` map (a dynamic `<component :is>`)
  3. Passes `value`, `fieldKey`, `structure` and `widgetStructure` as props, and listens for `fieldChange` / `comparatorChange` / `copyToClipboard`
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
cd frontend && pnpm test:ci
```

The tests use Vitest with `@vue/test-utils` (`mount`). Widget component tests sit next to each component:
- `frontend/src/components/fields/record-edit/YourWidgetEdit.spec.ts`
- `frontend/src/components/fields/record-view/YourWidgetRecordView.spec.ts`
- `frontend/src/components/fields/table-display/YourWidgetDisplay.spec.ts`
- `frontend/src/components/fields/filter/YourWidgetFilter.spec.ts`

`frontend/src/consts/widget-types.spec.ts` checks the registries against the frozen Angular snapshot.

---

## Real-World Example: Timezone Widget

The **Timezone widget** is a complete example demonstrating all the concepts covered in this guide.

### Implementation Details

**Backend Enum** (`backend/src/enums/widget-type.enum.ts:24`):
```typescript
Timezone = 'Timezone'
```

**Frontend Component** (`frontend/src/components/fields/record-edit/TimezoneEdit.vue`):
```vue
<script setup lang="ts">
import { computed, ref } from 'vue';
import { type SelectOption, UiField, UiSelect } from '@/components/ui';
import type { RecordEditFieldEmits, RecordEditFieldProps } from '../types';
import { useRecordEditField } from '../useFieldWidget';

const props = defineProps<RecordEditFieldProps & { value?: string | null }>();
const emit = defineEmits<RecordEditFieldEmits>();

const { normalizedLabel, widgetParams } = useRecordEditField(props);

const selected = ref<string | null>(props.value ?? null);

// Built once from the Intl API, sorted by name, each labelled with its current offset
const allTimezones: SelectOption<string | null>[] = Intl.supportedValuesOf('timeZone')
	.map((tz) => ({ value: tz, label: `${tz} (UTC${getTimezoneOffset(tz)})` }))
	.sort((a, b) => a.value.localeCompare(b.value));

// Empty option when the widget's allow_null or the column's allow_null is set
const timezones = computed<SelectOption<string | null>[]>(() =>
	widgetParams.value.allow_null || props.structure?.allow_null
		? [{ value: null, label: '' }, ...allTimezones]
		: allTimezones,
);

function onChange(value: string | null | (string | null)[]) {
	if (Array.isArray(value)) return;
	selected.value = value;
	emit('fieldChange', value);
}

function getTimezoneOffset(timezone: string): string {
	// `+HH:MM` from Intl's `longOffset` ("GMT+05:30"), with a manual fallback
	// ...
}
</script>

<template>
	<UiField class="timezone-edit" :label="normalizedLabel" :required="required">
		<UiSelect
			:name="`${label}-${fieldKey}`"
			:model-value="selected"
			:options="timezones"
			:disabled="disabled || readonly"
			:data-testid="`record-${label}-timezone`"
			@update:model-value="onChange"
		/>
	</UiField>
</template>
```

**Widget Registration in All Four Registries:**

1. `frontend/src/consts/record-edit-types.ts:33, 85`:
```typescript
const TimezoneEdit = defineAsyncComponent(() => import('@/components/fields/record-edit/TimezoneEdit.vue'));

export const UIwidgets = {
	// ... other widgets
	Timezone: TimezoneEdit,
	// ... other widgets
};
```

2. `frontend/src/consts/record-view-types.ts:41, 72`:
```typescript
export const UIwidgets = {
	// ... other widgets
	Timezone: TimezoneRecordView,
	// ... other widgets
};
```

3. `frontend/src/consts/table-display-types.ts:35, 64`:
```typescript
export const UIwidgets = {
	// ... other widgets
	Timezone: TimezoneDisplay,
	// ... other widgets
};
```

4. `frontend/src/consts/filter-types.ts:26, 46`:
```typescript
export const UIwidgets = {
	// ... other widgets
	Timezone: TimezoneFilter,
	// ... other widgets
};
```

Each of these entries is also listed in the frozen snapshot `frontend/src/consts/widget-types.angular.json`.

**Default Parameters** (`frontend/src/components/table/widget-defaults.ts:185-191`):
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
- Supports the `allow_null` parameter, and adds the empty option for nullable columns too
- `UiSelect` dropdown
- Alphabetically sorted timezone list
- The record view and table display show the zone with its offset; the table cell copies the value to the clipboard
- Comprehensive test coverage

**Component Files (All Four Contexts):**

Each context has the component, a Vitest spec and a Storybook story, under `frontend/src/components/fields/`:

**Record Edit Fields:**
- Component: `record-edit/TimezoneEdit.vue`
- Tests: `record-edit/TimezoneEdit.spec.ts`
- Stories: `record-edit/TimezoneEdit.stories.ts`

**Record View Fields:**
- Component: `record-view/TimezoneRecordView.vue`
- Tests: `record-view/TimezoneRecordView.spec.ts`
- Stories: `record-view/TimezoneRecordView.stories.ts`

**Table Display Fields:**
- Component: `table-display/TimezoneDisplay.vue`
- Tests: `table-display/TimezoneDisplay.spec.ts`
- Stories: `table-display/TimezoneDisplay.stories.ts`

**Filter Fields:**
- Component: `filter/TimezoneFilter.vue` (its option list comes from `filter/timezones.ts`)
- Tests: `filter/TimezoneFilter.spec.ts`
- Stories: `filter/TimezoneFilter.stories.ts`

**Registry Files:**
- `frontend/src/consts/record-edit-types.ts` (line 33, 85)
- `frontend/src/consts/record-view-types.ts` (line 41, 72)
- `frontend/src/consts/table-display-types.ts` (line 35, 64)
- `frontend/src/consts/filter-types.ts` (line 26, 46)

---

## Important Notes

1. **Four Field Contexts:** Understanding when each field type is used:
   - **Record Edit Fields:** Used in create/edit forms (modals, dedicated edit pages)
   - **Record View Fields:** Used in single record detail/view pages (read-only)
   - **Table Display Fields:** Used in table rows for listing multiple records (compact display)
   - **Filter Fields:** Used in filter panels for searching/filtering table data

2. **Composables, Not Inheritance:** Field components don't extend a base class. Each one types its props and events with `fields/types.ts` and calls the composable for its context:
   - `useRecordEditField(props)` for record-edit
   - `useViewField(props, emit)` for record-view and table-display
   - `useFilterField(props)` for filter

3. **Single-File Components:** Widgets are `<script setup lang="ts">` SFCs, loaded lazily through `defineAsyncComponent` in the registries. No other registration is needed. Use the `@/components/ui` primitives, and keep styles scoped with only `--color-*` variables.

4. **JSON5 Support:** Widget parameters support JSON5 format (comments, unquoted keys) in the UI editor, but are stored as standard JSON

5. **Security:** Widget parameters are parsed using `secure-json-parse` to prevent prototype pollution attacks

6. **Validation:** Always validate widget parameters both on frontend (user experience) and backend (security)

7. **Database Types:** Consider which database column types are compatible with your widget

8. **Cascading Deletes:** Widgets are automatically deleted when their parent `table_settings` record is removed

9. **Null Values:** Widget type can be null (defaults to standard rendering)

10. **Progressive Enhancement:** Start with the record-edit component. Add view/display/filter components only if you need custom behavior for those contexts

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
- `frontend/src/consts/record-edit-types.ts` - Edit form components
- `frontend/src/consts/record-view-types.ts` - Detail view components
- `frontend/src/consts/table-display-types.ts` - Table row components
- `frontend/src/consts/filter-types.ts` - Filter panel components
- `frontend/src/consts/widget-types.spec.ts` + `widget-types.angular.json` - Parity test against the frozen Angular snapshot

**Shared Widget Code:**
- `frontend/src/components/fields/types.ts` - Props and events of each context
- `frontend/src/components/fields/useFieldWidget.ts` - `useRecordEditField`, `useViewField`, `useFilterField`

**Widget Configuration:**
- **Widget Manager:** `frontend/src/views/table/TableWidgetsView.vue` with `frontend/src/components/table/TableWidgetItem.vue` - Configuration UI
- **Defaults:** `frontend/src/components/table/widget-defaults.ts` - Default params and docs links
- **Store:** `frontend/src/stores/tables.ts` - Widget fetch/update (`/widgets/:connectionId`, `/widget/:connectionId`)

**Component Directories:**
- **Record Edit Fields:** `frontend/src/components/fields/record-edit/` - Interactive form inputs
- **Record View Fields:** `frontend/src/components/fields/record-view/` - Read-only detail display
- **Table Display Fields:** `frontend/src/components/fields/table-display/` - Compact table display
- **Filter Fields:** `frontend/src/components/fields/filter/` - Search/filter inputs

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

**Last Updated:** 2026-11-03
