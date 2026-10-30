<script setup lang="ts">
/**
 * Port of filter-fields/email (`EmailFilterComponent`), a "smart" filter with its own comparator:
 * equal, domain equal, contains, starts with, ends with, is empty. "Domain equal" filters
 * `endswith` on `@<domain>`; an incoming `@…` value restores that mode and emits `endswith` on
 * mount. In the default `eq` mode nothing is emitted on mount.
 */
import { onMounted, ref } from 'vue';
import { type SelectOption, UiField, UiInput } from '@/components/ui';
import type { FilterFieldEmits, FilterFieldProps } from '../types';
import { useFilterField } from '../useFieldWidget';
import FilterComparatorRow from './FilterComparatorRow.vue';
import { type FocusTarget, useAutofocus } from './useAutofocus';

type EmailFilterMode = 'eq' | 'domain' | 'contains' | 'startswith' | 'endswith' | 'empty';

const MODES: SelectOption<EmailFilterMode>[] = [
	{ value: 'eq', label: 'equal' },
	{ value: 'domain', label: 'domain equal' },
	{ value: 'contains', label: 'contains' },
	{ value: 'startswith', label: 'starts with' },
	{ value: 'endswith', label: 'ends with' },
	{ value: 'empty', label: 'is empty' },
];

const props = defineProps<FilterFieldProps & { value?: string | null }>();
const emit = defineEmits<FilterFieldEmits>();

const { normalizedLabel } = useFilterField(props);

const input = ref<FocusTarget>(null);
useAutofocus(props, input);

const isDomain = Boolean(props.value?.startsWith('@'));
const filterMode = ref<EmailFilterMode>(isDomain ? 'domain' : 'eq');
const domainValue = ref(isDomain && props.value ? props.value.substring(1) : '');
const text = ref<string | null | undefined>(props.value);

onMounted(() => {
	if (filterMode.value !== 'eq')
		emit('comparatorChange', filterMode.value === 'domain' ? 'endswith' : filterMode.value);
});

function onFilterModeChange(mode: string) {
	filterMode.value = mode as EmailFilterMode;
	if (mode === 'domain') {
		text.value = domainValue.value ? `@${domainValue.value}` : '';
		emit('comparatorChange', 'endswith');
	} else if (mode === 'empty') {
		text.value = '';
		emit('comparatorChange', 'empty');
	} else {
		emit('comparatorChange', mode);
	}
	emit('fieldChange', text.value);
}

function onDomainChange(domain: string) {
	domainValue.value = domain;
	text.value = domain ? `@${domain}` : '';
	emit('fieldChange', text.value);
	emit('comparatorChange', 'endswith');
}

function onValueChange(value: string) {
	text.value = value;
	emit('fieldChange', value);
	emit('comparatorChange', filterMode.value);
}
</script>

<template>
	<FilterComparatorRow
		class="email-filter"
		:model-value="filterMode"
		:options="MODES"
		:label="`${normalizedLabel} comparator`"
		@update:model-value="onFilterModeChange"
	>
		<UiField floating-label v-if="filterMode === 'domain'" :label="`${normalizedLabel} (domain)`" :required="required">
			<div class="email-filter__domain">
				<span class="email-filter__prefix" aria-hidden="true">@</span>
				<UiInput
					ref="input"
					type="text"
					placeholder="gmail.com"
					:name="`${label}-${fieldKey}`"
					:model-value="domainValue"
					:disabled="disabled"
					:readonly="readonly"
					@update:model-value="onDomainChange"
				/>
			</div>
		</UiField>
		<UiField floating-label v-else-if="filterMode !== 'empty'" :label="normalizedLabel" :required="required">
			<UiInput
				ref="input"
				type="text"
				:name="`${label}-${fieldKey}`"
				:model-value="text ?? null"
				:disabled="disabled"
				:readonly="readonly"
				@update:model-value="onValueChange"
			/>
		</UiField>
	</FilterComparatorRow>
</template>

<style scoped>
.email-filter__domain {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.email-filter__prefix {
  font-size: var(--text-base);
  color: var(--color-muted);
}
</style>
