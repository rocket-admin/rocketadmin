<script setup lang="ts">
/** Port of filter-fields/id (`IdFilterComponent`): a UUID text filter with the GUID pattern check. */
import { computed, ref, watch } from 'vue';
import { UiField, UiInput } from '@/components/ui';
import { vCustomValidity } from '@/directives/customValidity';
import type { FilterFieldEmits, FilterFieldProps } from '../types';
import { useFilterField } from '../useFieldWidget';
import { type FocusTarget, useAutofocus } from './useAutofocus';

const props = defineProps<FilterFieldProps & { value?: string | null }>();
const emit = defineEmits<FilterFieldEmits>();

const { normalizedLabel } = useFilterField(props);

const input = ref<FocusTarget>(null);
useAutofocus(props, input);

/**
 * The Angular `pattern` attribute. Checked in script rather than as a native `pattern`: browsers
 * compile that with the `v` flag, where the unescaped `[{]` is a syntax error and the rule is dropped.
 */
const ID_PATTERN = /^[{]?[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}[}]?$/;

const text = ref(props.value ?? '');
const dirty = ref(false);
watch(
	() => props.value,
	(value) => {
		text.value = value ?? '';
	},
);

const patternMessage = computed(() =>
	text.value && !ID_PATTERN.test(text.value) ? "Value doesn't match pattern." : '',
);
const error = computed(() => (dirty.value && patternMessage.value) || undefined);

function onInput(value: string) {
	text.value = value;
	dirty.value = true;
	emit('fieldChange', value);
}
</script>

<template>
	<UiField floating-label class="id-filter" :label="normalizedLabel" :required="required" :error="error">
		<UiInput
			ref="input"
			v-custom-validity="patternMessage"
			type="text"
			:name="`${label}-${fieldKey}`"
			:model-value="text"
			:disabled="disabled"
			:readonly="readonly"
			:data-testid="`record-${label}-id`"
			@update:model-value="onInput"
		/>
	</UiField>
</template>
