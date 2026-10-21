# Filter Widget Architecture

Vue port of `frontend/src/app/components/ui-components/filter-fields/FILTER_WIDGETS.md`.

## Directory

All filter widgets live in `src/components/fields/filter/`, one flat SFC per widget, named after the
Angular class minus `Component` (`TextFilterComponent` → `TextFilter.vue`). Each has a colocated
`<Name>.spec.ts` (Vitest + @vue/test-utils) and `<Name>.stories.ts` (title `Filter Fields/<Name>`).

Shared pieces in the same directory:

| File | Role |
| --- | --- |
| `comparatorType.ts` | The Angular `static type` per widget, `getFilterComparatorType()`, `getComparatorFamily()`, `usesDefaultFilter()`, and the `TEXT_COMPARATORS` / `NUMBER_COMPARATORS` lists |
| `FilterComparatorRow.vue` | The smart-filter layout (`.filter-row` / `.comparator-field` / `.value-field`): comparator `UiSelect` + default slot |
| `DefaultFilter.vue` | The comparator wrapper hosts put around a simple widget |
| `useAutofocus.ts` | The `autofocus` prop: focuses the control 100 ms after mount |
| `timezones.ts` | The Intl timezone list of `TimezoneFilter` |
| `filterTestUtils.ts` | Spec helpers (`pickComparator`, `comparatorLabels`, `selectedComparator`) |

## Base contract (replaces `BaseFilterFieldComponent`)

`../types.ts` + `../useFieldWidget.ts`:

```ts
const props = defineProps<FilterFieldProps & { value?: string | null }>();
const emit = defineEmits<FilterFieldEmits>();
const { normalizedLabel, widgetParams } = useFilterField(props);
```

**Props (`FilterFieldProps`):** `fieldKey` (Angular `key`, which is reserved in Vue), `label`,
`required`, `readonly`, `structure` (TableField), `disabled`, `widgetStructure`, `relations`
(TableForeignKey), `autofocus`. Each widget declares its own typed `value`.

**Events (`FilterFieldEmits`):** `fieldChange` (Angular `onFieldChange`, the filter value) and
`comparatorChange` (Angular `onComparatorChange`, the comparator string).

**Composable:** `normalizedLabel` (human-readable field name) and `widgetParams` (widget params
parsed whether they arrive as an object or a JSON string; `{}` when unparseable).

## Two Types of Filter Widgets

### 1. Simple filters (the host adds the comparator)

The widget's comparator type is listed in `FILTER_COMPARATOR_TYPES` (`comparatorType.ts`), the
replacement for the Angular `static type`:

- `'text'` (TextFilter, LongTextFilter) → starts with, ends with, equal, contains, not contains, is empty
- `'number'` (NumberFilter, TimeIntervalFilter) or `'datetime'` (DateFilter, TimeFilter) → equal,
  gt, lt, gte, lte, in, between
- `'file'` (FileFilter), `'timezone'` (TimezoneFilter), or not listed → `nonComparable`: no
  comparator is shown

The widget only emits `fieldChange`. The host renders it inside `DefaultFilter`, which owns the
comparator select.

### 2. Smart filters (the widget manages its own comparator)

Not listed in `FILTER_COMPARATOR_TYPES`, so `getComparatorFamily()` is `nonComparable` and the
host renders only the widget. The widget keeps an internal `filterMode`, renders its own select
through `FilterComparatorRow`, and emits both `fieldChange` and `comparatorChange`.

**Examples:** `EmailFilter`, `PhoneFilter`, `DateTimeFilter`, `BinaryFilter`; `BooleanFilter` and
`SelectFilter` render no select but still emit `comparatorChange` (`eq`, or `in` for several
selected values).

## Why the type lives in a table, not on the component

A Vue SFC has no static members, and the maps in `@/consts/filter-types` hand out
`defineAsyncComponent` wrappers whose target has not loaded when the host decides which comparator
list to show. `getFilterComparatorType(component)` therefore looks the wrapper up by identity
(every DB-type entry reuses one wrapper per widget), and falls back to the SFC's compiled
`__name` for a widget imported directly (tests, stories). It unwraps reactive proxies first.

## Comparator routing (host side)

```ts
import { UIwidgets, filterTypes } from '@/consts/filter-types';
import { getComparatorFamily, getFilterComparatorType, usesDefaultFilter } from '@/components/fields/filter/comparatorType';
import DefaultFilter from '@/components/fields/filter/DefaultFilter.vue';

const valueComponent = isWidget(field) ? UIwidgets[widgetType] : filterTypes[connectionType][columnType];
const component = usesDefaultFilter(valueComponent) ? DefaultFilter : valueComponent;
const props = usesDefaultFilter(valueComponent)
	? { ...baseProps, valueComponent, comparator: comparators[field] || 'eq' }
	: isWidget(field) ? { ...baseProps, widgetStructure } : baseProps;
```

```vue
<component :is="component" v-bind="props"
	@field-change="(value) => updateField(value, field)"
	@comparator-change="(comparator) => updateComparator(comparator, field)" />
```

`baseProps` = `{ fieldKey, label, value, structure, relations (foreign keys only), autofocus }`.

## Registration

In `src/consts/filter-types.ts`:

- `UIwidgets`: widget type name → lazy component (e.g. `DateTime: DateTimeFilter`)
- `filterTypes`: database column type → lazy component, per database (e.g.
  `postgres['timestamp without time zone']: DateTimeFilter`)

A new simple widget also needs its type in `FILTER_COMPARATOR_TYPES` **and** its wrapper in
`BY_WRAPPER` in `comparatorType.ts`.

## Data Flow

1. User adds a filter → the host stores the field's value and comparator (default `'eq'`).
2. `<component :is>` renders the widget (or `DefaultFilter` around it) with the props above and
   listens to `fieldChange` / `comparatorChange`.
3. The widget emits value / comparator → the host stores them.
4. "Filter" → filters are encoded as JsonURL in the `filters` query param → the table refetches.

## Filter Data Format

URL: `?filters=<JsonURL-encoded>` where filters = `{ fieldName: { comparator: value } }`

Example: `{ created_at: { gte: "2024-01-01T00:00:00Z" }, email: { endswith: "@gmail.com" } }`

## What each widget emits, and when

| Widget | On mount | On change |
| --- | --- | --- |
| DefaultFilter | `comparatorChange(comparator)` | `empty` → `fieldChange('')`; switching into `in` / `between` → `fieldChange(undefined)`; then `comparatorChange`. `in` → trimmed parts or `undefined`; `between` → `[lower, upper]` |
| DateTimeFilter | no value → `fieldChange(<last day>)` + `comparatorChange('gte')`; string value → `comparatorChange('gte')`; `comparator` `between` / `in` + array → `comparatorChange(that)` | presets → value + `gte`; date / time → `<date>T<time>Z` + mode; between → `[lower \| null, upper \| null]` + `between`; in → parts + `in` |
| EmailFilter | `@domain` value → `comparatorChange('endswith')`, else nothing | domain → `@<domain>` + `endswith`; empty → `''` + `empty`; text → value + mode |
| PhoneFilter | dial-code value → `comparatorChange('startswith')`, else nothing | country → dial code + `startswith`; empty → `''` + `empty`; text → value + mode |
| BinaryFilter | nothing | input → hex (`''` while undecodable) + mode; mode → comparator + current hex (`''` for empty) |
| BooleanFilter | `comparatorChange('eq')` | `true`/`false`/`null` (`1`/`0` for MySQL, MSSQL, Oracle) + `eq` |
| SelectFilter | `comparatorChange('eq')` | none → `undefined` + `eq`; one → scalar + `eq`; several → array + `in` |
| PasswordFilter | `fieldChange(value)` (`***` → `''`) | value; "Clear password" → `null` |
| ForeignKeyFilter | `fieldChange(<referenced value>)` once the current row loads | debounced 500 ms: known suggestion → its value; `''` → `null` |
| Text, Number (parsed, `null` when empty), LongText, Date (`yyyy-MM-dd`), Time, Id, Country (code), Timezone, JsonEditor (text), TimeInterval (Postgres interval), Point (`{ x, y }`) | nothing | `fieldChange(value)` |
| StaticText, BinaryDataCaption, File | nothing | nothing |

---

# How to Create a New Filter Widget

## Step 1: Create the SFC

`src/components/fields/filter/<Name>Filter.vue`:

```vue
<script setup lang="ts">
/** Port of filter-fields/<name> (`<Name>FilterComponent`): what it filters. */
import { onMounted, ref } from 'vue';
import { type SelectOption, UiField, UiInput } from '@/components/ui';
import type { FilterFieldEmits, FilterFieldProps } from '../types';
import { useFilterField } from '../useFieldWidget';
import FilterComparatorRow from './FilterComparatorRow.vue'; // smart filters only
import { type FocusTarget, useAutofocus } from './useAutofocus';

const MODES: SelectOption<string>[] = [{ value: 'eq', label: 'equal' } /* … */];

const props = defineProps<FilterFieldProps & { value?: string | null }>();
const emit = defineEmits<FilterFieldEmits>();
const { normalizedLabel } = useFilterField(props);

const input = ref<FocusTarget>(null);
useAutofocus(props, input);

// Smart filter: an internal mode, restored from `props.value` here (the Angular ngOnInit).
const filterMode = ref('eq');
const text = ref(props.value ?? '');

// The Angular ngAfterViewInit emission (smart filters only).
onMounted(() => emit('comparatorChange', filterMode.value));

function onFilterModeChange(mode: string) {
	filterMode.value = mode;
	emit('comparatorChange', mode); // or map it to a backend comparator
	emit('fieldChange', text.value);
}

function onValueChange(value: string) {
	text.value = value;
	emit('fieldChange', value);
	emit('comparatorChange', filterMode.value); // smart filter only
}
</script>

<template>
	<!-- Simple filter: just the UiField. -->
	<FilterComparatorRow
		:model-value="filterMode"
		:options="MODES"
		:label="`${normalizedLabel} comparator`"
		@update:model-value="onFilterModeChange"
	>
		<UiField v-if="filterMode !== 'empty'" :label="normalizedLabel" :required="required">
			<UiInput
				ref="input"
				:name="`${label}-${fieldKey}`"
				:model-value="text"
				:disabled="disabled"
				:readonly="readonly"
				@update:model-value="onValueChange"
			/>
		</UiField>
	</FilterComparatorRow>
</template>
```

Styling: scoped `<style>`, BEM classes named after the widget (`.name-filter__part`), only
`var(--…)` tokens from `src/assets/theme.css` (`font-size`, `gap` and `padding` must use one).

`<script setup>` cannot export values: shared constants go in a sibling `.ts` file.

## Step 2: Register it

1. In `src/consts/filter-types.ts`, add a `defineAsyncComponent` for it and put it in `UIwidgets`
   and/or the `filterTypes` DB maps.
2. A simple widget: add its name to `FILTER_COMPARATOR_TYPES` and its wrapper to `BY_WRAPPER` in
   `comparatorType.ts`.

## Step 3: Tests and a story

```ts
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { pickComparator } from './filterTestUtils';
import NameFilter from './NameFilter.vue';

describe('NameFilter', () => {
	it('emits the comparator on mount', () => {
		const wrapper = mount(NameFilter, { props: { label: 'field' } });
		expect(wrapper.emitted('comparatorChange')).toEqual([['eq']]);
	});

	it('emits the value with the picked mode', async () => {
		const wrapper = mount(NameFilter, { props: { label: 'field' } });
		await pickComparator(wrapper, 'contains');
		await wrapper.find('input').setValue('abc');
		expect(wrapper.emitted('fieldChange')?.at(-1)).toEqual(['abc']);
		expect(wrapper.emitted('comparatorChange')?.at(-1)).toEqual(['contains']);
	});
});
```

Cover: value emission, comparator emission (on mount and on change), restoring from an incoming
value, mode switching. Widgets using a store: `setActivePinia(createPinia())` in `beforeEach` and
`vi.spyOn(useTablesStore(), 'fetchTable')`; the connections store needs
`vi.mock('@/lib/cedar-wasm', …)` to keep the Cedar engine from loading.

The story: `title: 'Filter Fields/<Name>'`, `tags: ['autodocs']`, `satisfies Meta<typeof X>`,
args from `mockStructure()` / `mockWidgetStructure()` (`../stories.mocks`), and the
Default / Required / Readonly / Disabled stories. Stub stores in a decorator when the widget fetches.

## Key Gotchas

- **Emit on mount with `onMounted`**, not in a watcher: hosts rely on the initial
  `comparatorChange` the Angular `ngAfterViewInit` sent. `mount()` captures it, so specs see it in
  `wrapper.emitted()`.
- **Comparator mapping**: internal modes can differ from backend comparators. Email's `'domain'`
  emits `'endswith'`; Phone's `'country'` emits `'startswith'`; DateTime's presets emit `'gte'`.
- **URL restoration**: a restored value can't tell preset modes from custom ones; default to the
  custom comparator (DateTime restores a string as `gte`). DateTime and DefaultFilter take a
  `comparator` prop to restore `between` / `in` from an array value.
- **Timezone**: for datetime values use `toISOString()` for genuine UTC. Never `format()` with a
  literal `'Z'` — that is local time with a fake UTC marker.
- **Boolean-ish `value` props**: a `value` typed `boolean | string` makes Vue cast `''` to `true`.
  Put `string` first in the union (`string | number | boolean | null`).
- **Focus**: `useAutofocus` focuses a native element, a primitive's root control, or a component's
  exposed `focus()` (UiAutocomplete). A segmented group focuses its first radio.
