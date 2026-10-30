<script setup lang="ts">
/**
 * Port of filter-fields/password (`PasswordFilterComponent`): a password input plus the
 * "Clear password" checkbox, which emits `null`. The masked `***` placeholder value is blanked, and
 * the (possibly blanked) value is emitted at once, as the Angular `ngOnInit` did.
 */
import { ref } from 'vue';
import { UiCheckbox, UiField, UiInput } from '@/components/ui';
import type { FilterFieldEmits, FilterFieldProps } from '../types';
import { useFilterField } from '../useFieldWidget';
import { type FocusTarget, useAutofocus } from './useAutofocus';

const props = defineProps<FilterFieldProps & { value?: string | null }>();
const emit = defineEmits<FilterFieldEmits>();

const { normalizedLabel } = useFilterField(props);

const input = ref<FocusTarget>(null);
useAutofocus(props, input);

const password = ref<string | null | undefined>(props.value === '***' ? '' : props.value);
const clearPassword = ref(false);

emit('fieldChange', password.value);

function onInput(value: string) {
	password.value = value;
	emit('fieldChange', value);
}

function onClearPasswordChange(checked: boolean) {
	clearPassword.value = checked;
	if (checked) emit('fieldChange', null);
}
</script>

<template>
	<div class="password-filter">
		<UiField floating-label :label="normalizedLabel" :required="required" hint="To keep password the same keep this field blank.">
			<UiInput
				ref="input"
				type="password"
				autocomplete="new-password"
				:name="`${label}-${fieldKey}`"
				:model-value="password ?? null"
				:disabled="disabled || clearPassword"
				:readonly="readonly"
				@update:model-value="onInput"
			/>
		</UiField>
		<!-- Same rule as Angular: only an empty (or null) password can be cleared. -->
		<UiCheckbox
			class="password-filter__clear"
			:model-value="clearPassword"
			:disabled="password !== '' && password !== null"
			@update:model-value="onClearPasswordChange"
		>
			Clear password
		</UiCheckbox>
	</div>
</template>

<style scoped>
.password-filter {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
</style>
