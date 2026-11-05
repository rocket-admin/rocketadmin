<script setup lang="ts">
/**
 * Port of record-edit-fields/password (`PasswordEditComponent`). The API masks stored passwords as
 * `***`; that shows as an empty input, and an empty input is never sent, so the password is kept
 * unless the user types a new one or ticks "Clear password" (which sends `null`).
 */
import { onMounted, ref } from 'vue';
import { UiCheckbox, UiField, UiInput } from '@/components/ui';
import type { RecordEditFieldEmits, RecordEditFieldProps } from '../types';
import { useRecordEditField } from '../useFieldWidget';

const props = defineProps<RecordEditFieldProps & { value?: string | null }>();
const emit = defineEmits<RecordEditFieldEmits>();

const { normalizedLabel } = useRecordEditField(props);

const password = ref<string | null>(props.value === '***' ? '' : (props.value ?? null));
const clearPassword = ref(false);

onMounted(() => {
	if (password.value != null && password.value !== '') emit('fieldChange', password.value);
});

function onPasswordChange(value: string) {
	password.value = value;
	if (value !== '') emit('fieldChange', value);
}

function onClearPasswordChange(checked: boolean) {
	clearPassword.value = checked;
	if (checked) emit('fieldChange', null);
}
</script>

<template>
	<div class="password-edit">
		<UiField :label="normalizedLabel" :required="required" hint="To keep password the same keep this field blank.">
			<UiInput
				type="password"
				autocomplete="new-password"
				:name="`${label}-${fieldKey}`"
				:model-value="password"
				:disabled="disabled || clearPassword"
				:readonly="readonly"
				@update:model-value="onPasswordChange"
			/>
		</UiField>
		<UiCheckbox
			class="password-edit__clear"
			:model-value="clearPassword"
			:disabled="password !== '' && password !== null"
			@update:model-value="onClearPasswordChange"
		>
			Clear password
		</UiCheckbox>
	</div>
</template>

<style scoped>
.password-edit {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.password-edit__clear {
  margin-bottom: var(--space-5);
}
</style>
