<script setup lang="ts">
/**
 * Port of record-edit-fields/long-text (`LongTextEditComponent`): a multi-line text column.
 * `widget_params.rows` sets the height (4 by default); `validate` / `regex` validate like the text
 * widget. The typed text is emitted as-is.
 */
import { computed, ref } from 'vue';
import { UiField, UiTextarea } from '@/components/ui';
import { vCustomValidity } from '@/directives/customValidity';
import { textErrors, textValidationMessage } from '@/validators/text.validator';
import type { RecordEditFieldEmits, RecordEditFieldProps } from '../types';
import { useRecordEditField } from '../useFieldWidget';

const props = defineProps<RecordEditFieldProps & { value?: string | null }>();
const emit = defineEmits<RecordEditFieldEmits>();

const { normalizedLabel, widgetParams } = useRecordEditField(props);

const text = ref(props.value ?? '');
const dirty = ref(false);

const maxLength = computed(() => props.structure?.character_maximum_length || null);
const rowsCount = computed(() => Number(widgetParams.value.rows || '4') || 4);
const validateType = computed<string | null>(() => widgetParams.value.validate || null);
const regexPattern = computed<string | null>(() => widgetParams.value.regex || null);

/** The `N / max` counter, shown only within 100 characters of the limit. */
const showCounter = computed(() =>
	Boolean(maxLength.value && maxLength.value > 0 && text.value && maxLength.value - text.value.length < 100),
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
	emit('fieldChange', value);
}
</script>

<template>
	<UiField class="long-text-edit" :label="normalizedLabel" :required="required" :error="error">
		<UiTextarea
			v-custom-validity="validationMessage"
			:name="`${label}-${fieldKey}`"
			:model-value="text"
			:rows="rowsCount"
			:maxlength="maxLength ?? undefined"
			:disabled="disabled"
			:readonly="readonly"
			:data-testid="`record-${label}-long-text`"
			@update:model-value="onInput"
		/>
		<span v-if="showCounter" class="long-text-edit__counter">{{ text.length }} / {{ maxLength }}</span>
	</UiField>
</template>

<style scoped>
.long-text-edit__counter {
  align-self: flex-end;
  font-size: var(--text-xs);
  color: var(--color-muted);
}
</style>
