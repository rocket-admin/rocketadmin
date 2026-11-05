<script setup lang="ts">
/**
 * Port of record-edit-fields/image (`ImageEditComponent`): an image URL with a preview. With
 * `widget_params.prefix` the column stores only the tail of the URL; the prefix is shown before the
 * input and prepended for validation and the preview.
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
const imageUrl = computed(() => (url.value ? prefix.value + url.value : ''));
const validationMessage = computed(() => (urlErrors(url.value, prefix.value) ? URL_ERROR_MESSAGE : ''));
const error = computed(() => (dirty.value && validationMessage.value) || undefined);

function onInput(value: string) {
	url.value = value;
	dirty.value = true;
	emit('fieldChange', value);
}
</script>

<template>
	<div class="image-edit">
		<UiField :label="normalizedLabel" :required="required" :error="error">
			<div class="image-edit__control">
				<span v-if="prefix" class="image-edit__prefix">{{ prefix }}</span>
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
		<img v-if="imageUrl && !validationMessage" class="image-edit__image" :src="imageUrl" :alt="normalizedLabel">
	</div>
</template>

<style scoped>
.image-edit {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.image-edit__control {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.image-edit__prefix {
  flex: none;
  max-width: 50%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--text-sm);
  color: var(--color-muted);
}

.image-edit__image {
  align-self: flex-start;
  max-width: 100%;
  height: auto;
  max-height: 200px;
  border-radius: var(--radius-control);
}
</style>
