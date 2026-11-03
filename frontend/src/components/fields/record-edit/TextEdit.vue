<script setup lang="ts">
/** Port of record-edit-fields/text (`TextEditComponent`): a single-line text column. */
import { computed, ref } from 'vue';
import { UiField, UiInput } from '@/components/ui';
import { vCustomValidity } from '@/directives/customValidity';
import { textErrors, textValidationMessage } from '@/validators/text.validator';
import type { RecordEditFieldEmits, RecordEditFieldProps } from '../types';
import { useRecordEditField } from '../useFieldWidget';

const props = defineProps<RecordEditFieldProps & { value?: string | null }>();
const emit = defineEmits<RecordEditFieldEmits>();

const { normalizedLabel, widgetParams } = useRecordEditField(props);

const text = ref(props.value ?? '');
/** Errors show once the user has edited the field, like `mat-error` on a dirty control. */
const dirty = ref(false);

const maxLength = computed(() => props.structure?.character_maximum_length || null);
const validateType = computed<string | null>(() => widgetParams.value.validate || null);
const regexPattern = computed<string | null>(() => widgetParams.value.regex || null);
const forceSendEmptyString = computed(() => Boolean(widgetParams.value.force_send_empty_string));

/** The `N / max` counter, shown only within 100 characters of the limit. */
const showCounter = computed(() =>
	Boolean(maxLength.value && maxLength.value > 0 && text.value && 100 > maxLength.value - text.value.length),
);

const validationMessage = computed(() =>
	textErrors(text.value, validateType.value, regexPattern.value) ? textValidationMessage(validateType.value) : '',
);

const error = computed(() => {
	if (!dirty.value) return undefined;
	if (props.required && !text.value) return 'This field is required.';
	if (maxLength.value && text.value.length > maxLength.value) return `Maximum length is ${maxLength.value} characters.`;
	return validationMessage.value || undefined;
});

function onInput(value: string) {
	text.value = value;
	dirty.value = true;
	if (value === '' && !forceSendEmptyString.value && props.structure?.allow_null === true) {
		emit('fieldChange', null);
		return;
	}
	emit('fieldChange', value);
}
</script>

<template>
	<UiField class="text-edit" :label="normalizedLabel" :required="required" :error="error">
		<div class="text-edit__control">
			<UiInput
				v-custom-validity="validationMessage"
				:name="`${label}-${fieldKey}`"
				:model-value="text"
				:disabled="disabled"
				:readonly="readonly"
				:maxlength="maxLength ?? undefined"
				:data-testid="`record-${label}-text`"
				@update:model-value="onInput"
			/>
			<span v-if="showCounter" class="text-edit__counter">{{ text.length }} / {{ maxLength }}</span>
		</div>
	</UiField>
</template>

<style scoped>
.text-edit__control {
  position: relative;
}

.text-edit__counter {
  position: absolute;
  inset-inline-end: var(--space-3);
  top: 50%;
  transform: translateY(-50%);
  font-size: var(--text-xs);
  color: var(--color-muted);
  pointer-events: none;
}
</style>
