<script setup lang="ts">
/**
 * Port of record-edit-fields/s3 (`S3EditComponent`): a column holding an S3 object key. The key
 * can be typed, or a file uploaded through a presigned URL (the new key is emitted); the current
 * object is previewed through a presigned GET URL — a thumbnail for images, a file icon otherwise.
 *
 * Preview needs the row's primary key (`rowPrimaryKey`), so a new row only previews after upload.
 */
import { computed, ref, watch } from 'vue';
import { UiButton, UiField, UiIcon, UiInput, UiSpinner } from '@/components/ui';
import { useConnectionsStore } from '@/stores/connections';
import { useS3Store } from '@/stores/s3';
import { useTablesStore } from '@/stores/tables';
import type { RecordEditFieldEmits, RecordEditFieldProps } from '../types';
import { useRecordEditField } from '../useFieldWidget';

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];

const props = defineProps<
	RecordEditFieldProps & { value?: string | null; rowPrimaryKey?: Record<string, unknown> | null }
>();
const emit = defineEmits<RecordEditFieldEmits>();

const { normalizedLabel, widgetParams } = useRecordEditField(props);

const s3 = useS3Store();
const connections = useConnectionsStore();
const tables = useTablesStore();

const previewUrl = ref<string | null>(null);
const isLoading = ref(false);
const internalValue = ref(props.value ?? '');
const fileInput = ref<HTMLInputElement | null>(null);

const currentKey = computed(() => internalValue.value || props.value || '');

const displayFilename = computed(() => {
	const key = currentKey.value;
	if (!key) return '';
	const name = key.split('/').pop() || key;
	return name.length > 40 ? `...${name.slice(-37)}` : name;
});

const isImage = computed(() => {
	if (widgetParams.value.type === 'image') return true;
	const key = currentKey.value.toLowerCase();
	return Boolean(key) && IMAGE_EXTENSIONS.some((ext) => key.endsWith(ext));
});

const fileAccept = computed(() => (widgetParams.value.type === 'image' ? 'image/*' : '*/*'));

// Angular loaded on init and again from an effect whenever the value or row key changed while no
// preview was shown and none was loading; one immediate watcher covers both.
watch(
	[() => props.value, () => props.rowPrimaryKey],
	([value, rowPrimaryKey]) => {
		if (value && rowPrimaryKey && !previewUrl.value && !isLoading.value) loadPreview();
	},
	{ immediate: true },
);

async function onFileSelected(event: Event) {
	const input = event.target as HTMLInputElement;
	const file = input.files?.[0];
	const fieldName = props.widgetStructure?.field_name;
	if (!file || !fieldName || !connections.connectionID || !tables.tableName) return;

	isLoading.value = true;
	const result = await s3.uploadFile(connections.connectionID, tables.tableName, fieldName, file);
	if (result) {
		internalValue.value = result.key;
		previewUrl.value = result.previewUrl;
		emit('fieldChange', result.key);
	}
	isLoading.value = false;
}

function openFile() {
	if (previewUrl.value) window.open(previewUrl.value, '_blank');
}

function onValueChange(value: string) {
	internalValue.value = value;
	emit('fieldChange', value);
}

async function loadPreview() {
	const key = props.value || internalValue.value;
	const rowPrimaryKey = props.rowPrimaryKey;
	const fieldName = props.widgetStructure?.field_name;
	const connectionId = connections.connectionID;
	const tableName = tables.tableName;
	if (!key || !connectionId || !tableName || !rowPrimaryKey || !fieldName) return;

	isLoading.value = true;
	const response = await s3.getFileUrl(connectionId, tableName, fieldName, rowPrimaryKey);
	if (response) previewUrl.value = response.url;
	isLoading.value = false;
}
</script>

<template>
	<div class="s3-edit">
		<UiField :label="normalizedLabel" :required="required">
			<UiInput
				:name="`${label}-${fieldKey}`"
				:model-value="currentKey"
				:disabled="disabled"
				:readonly="readonly"
				:data-testid="`record-${label}-s3`"
				@update:model-value="onValueChange"
			/>
		</UiField>

		<div class="s3-edit__actions">
			<input ref="fileInput" type="file" hidden :accept="fileAccept" @change="onFileSelected">
			<UiButton variant="secondary" size="sm" :disabled="disabled || readonly || isLoading" @click="fileInput?.click()">
				<template #leading><UiIcon name="upload" size="sm" /></template>
				Upload
			</UiButton>
			<UiButton v-if="previewUrl" variant="secondary" size="sm" @click="openFile">
				<template #leading><UiIcon name="open_in_new" size="sm" /></template>
				Open
			</UiButton>
		</div>

		<div v-if="currentKey" class="s3-edit__preview">
			<UiSpinner v-if="isLoading" label="Loading preview" />
			<img v-else-if="isImage && previewUrl" :src="previewUrl" class="s3-edit__thumbnail" alt="Preview">
			<div v-else-if="previewUrl" class="s3-edit__file">
				<UiIcon name="insert_drive_file" size="lg" />
				<span class="s3-edit__filename">{{ displayFilename }}</span>
			</div>
		</div>
	</div>
</template>

<style scoped>
.s3-edit {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.s3-edit__actions {
  display: flex;
  gap: var(--space-2);
}

.s3-edit__preview {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100px;
  padding: var(--space-2);
  border: 1px dashed var(--color-line-strong);
  border-radius: var(--radius-control);
}

.s3-edit__thumbnail {
  max-width: 200px;
  max-height: 150px;
  object-fit: contain;
  border-radius: var(--radius-control);
}

.s3-edit__file {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-muted);
}

.s3-edit__filename {
  font-size: var(--text-xs);
  word-break: break-all;
  text-align: center;
}
</style>
