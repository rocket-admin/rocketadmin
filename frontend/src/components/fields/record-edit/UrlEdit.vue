<script setup lang="ts">
/**
 * Port of record-edit-fields/url (`UrlEditComponent`): a URL column. `widget_params.prefix` is
 * shown before the input and prepended for validation only — the stored value is what was typed.
 */
import { computed, ref } from 'vue';
import { UiField, UiInput } from '@/components/ui';
import { vCustomValidity } from '@/directives/customValidity';
import { URL_ERROR_MESSAGE, urlErrors } from '@/validators/url.validator';
import type { RecordEditFieldEmits, RecordEditFieldProps } from '../types';
import { useRecordEditField } from '../useFieldWidget';

const props = defineProps<RecordEditFieldProps & { value?: string | null }>();
const emit = defineEmits<RecordEditFieldEmits>();

const { normalizedLabel, widgetParams } = useRecordEditField(props);

const url = ref(props.value ?? '');
const dirty = ref(false);

const prefix = computed<string>(() => widgetParams.value.prefix || '');

const validationMessage = computed(() => (urlErrors(url.value, prefix.value) ? URL_ERROR_MESSAGE : ''));
const error = computed(() => (dirty.value && validationMessage.value) || undefined);

function onInput(value: string) {
	url.value = value;
	dirty.value = true;
	emit('fieldChange', value);
}
</script>

<template>
	<UiField class="url-edit" :label="normalizedLabel" :required="required" :error="error">
		<div class="url-edit__control">
			<span v-if="prefix" class="url-edit__prefix" :title="prefix">{{ prefix }}</span>
			<UiInput
				v-custom-validity="validationMessage"
				:name="`${label}-${fieldKey}`"
				:model-value="url"
				:disabled="disabled"
				:readonly="readonly"
				:data-testid="`record-${label}-image`"
				@update:model-value="onInput"
			/>
		</div>
	</UiField>
</template>

<style scoped>
.url-edit__control {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

/* Long prefixes are cut at 30% of the row, as in Angular, with the full text in the tooltip. */
.url-edit__prefix {
  flex: 0 1 auto;
  max-width: 30%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--text-sm);
  color: var(--color-muted);
}
</style>
