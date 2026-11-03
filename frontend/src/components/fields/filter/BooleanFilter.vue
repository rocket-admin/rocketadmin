<script setup lang="ts">
/**
 * Port of filter-fields/boolean (`BooleanFilterComponent`): Yes / No (/ Null for nullable columns)
 * toggles. MySQL, MSSQL and Oracle get `1`/`0`, other databases `true`/`false`; Null is `null`.
 * Emits `comparatorChange('eq')` on mount and with every change.
 */
import { computed, onMounted, ref } from 'vue';
import { type SelectOption, UiSegmented } from '@/components/ui';
import { DBtype } from '@/models/connection';
import { useConnectionsStore } from '@/stores/connections';
import type { FilterFieldEmits, FilterFieldProps } from '../types';
import { useFilterField } from '../useFieldWidget';
import { type FocusTarget, useAutofocus } from './useAutofocus';

type BooleanChoice = boolean | 'unknown';

// `value: undefined` turns off Vue's boolean casting, which would read an absent value as `false`
// ("No") instead of Angular's Null.
const props = withDefaults(defineProps<FilterFieldProps & { value?: string | number | boolean | null }>(), {
	value: undefined,
});
const emit = defineEmits<FilterFieldEmits>();

const { normalizedLabel, widgetParams } = useFilterField(props);
const connections = useConnectionsStore();

const group = ref<FocusTarget>(null);
useAutofocus(props, group);

const booleanValue = ref<BooleanChoice | undefined>(toChoice(props.value));

/** The Null toggle, for nullable columns or `allow_null` in widget params. */
const isRadiogroup = computed(() => Boolean(props.structure?.allow_null || widgetParams.value.allow_null));

const options = computed<SelectOption<BooleanChoice>[]>(() => [
	{ value: true, label: 'Yes' },
	{ value: false, label: 'No' },
	...(isRadiogroup.value ? [{ value: 'unknown' as const, label: 'Null' }] : []),
]);

onMounted(() => emit('comparatorChange', 'eq'));

function onBooleanChange(choice: BooleanChoice) {
	booleanValue.value = choice;
	let formattedValue: boolean | number | null;
	switch (connections.currentConnection.type) {
		case DBtype.MySQL:
		case DBtype.MSSQL:
		case DBtype.Oracle:
			formattedValue = choice === 'unknown' ? null : Number(choice);
			break;
		default:
			formattedValue = choice === 'unknown' ? null : choice;
	}
	emit('fieldChange', formattedValue);
	emit('comparatorChange', 'eq');
}

/** The Angular `setBooleanValue`: booleans as is, empty as Null, the usual 0/1/T/F/Y/N spellings. */
function toChoice(value: boolean | number | string | null | undefined): BooleanChoice | undefined {
	if (typeof value === 'boolean') return value;
	if (value === null || value === undefined || value === '') return 'unknown';
	switch (value) {
		case 0:
		case '0':
		case 'F':
		case 'N':
		case 'false':
			return false;
		case 1:
		case '1':
		case 'T':
		case 'Y':
		case 'true':
			return true;
	}
	return undefined;
}
</script>

<template>
	<div class="boolean-filter">
		<span class="boolean-filter__label">{{ normalizedLabel }}</span>
		<UiSegmented
			ref="group"
			:model-value="booleanValue"
			:options="options"
			:label="normalizedLabel || 'Value'"
			:disabled="disabled"
			:data-testid="`record-${label}-boolean-radio-group`"
			@update:model-value="onBooleanChange"
		/>
	</div>
</template>

<style scoped>
.boolean-filter {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.boolean-filter__label {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--color-ink-soft);
}
</style>
