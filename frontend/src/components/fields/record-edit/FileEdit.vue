<script setup lang="ts">
/**
 * Port of record-edit-fields/file (`FileEditComponent`): a binary column edited as hex, as base64
 * or by uploading a file. The stored value is always hex: base64 input and uploaded files are
 * converted before `fieldChange`.
 *
 * With `widget_params.type` the mode is fixed and its name is shown instead of the switcher;
 * otherwise a Hex / Base64 / File switcher converts the current value between views (locked while
 * the base64 or hex text is invalid).
 */
import { computed, onBeforeUnmount, ref } from 'vue';
import { type SelectOption, UiButton, UiField, UiSegmented, UiTextarea } from '@/components/ui';
import { vCustomValidity } from '@/directives/customValidity';
import { BASE64_ERROR_MESSAGE, base64Errors } from '@/validators/base64.validator';
import { HEX_ERROR_MESSAGE, hexErrors } from '@/validators/hex.validator';
import type { RecordEditFieldEmits, RecordEditFieldProps } from '../types';
import { useRecordEditField } from '../useFieldWidget';

type FileType = 'hex' | 'base64' | 'file';

const props = defineProps<RecordEditFieldProps & { value?: string | null }>();
const emit = defineEmits<RecordEditFieldEmits>();

const { normalizedLabel, widgetParams } = useRecordEditField(props);

const FILE_TYPES: SelectOption<FileType>[] = [
	{ value: 'hex', label: 'HEX' },
	{ value: 'base64', label: 'Base64' },
	{ value: 'file', label: 'File' },
];

const fixedType = computed<FileType | null>(() => {
	const type: unknown = widgetParams.value.type;
	return type === 'hex' || type === 'base64' || type === 'file' ? type : null;
});

const fileType = ref<FileType>(fixedType.value || 'hex');
const hexData = ref(props.value ?? '');
const base64Data = ref(fileType.value === 'base64' ? (props.value ?? '') : '');
/** Angular's `isNotSwitcherActive`: the current text can't be converted, so switching is locked. */
const switcherLocked = ref(false);
const fileURL = ref<string | null>(null);
const dirty = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

/** A fixed-type value that doesn't parse as its type; nothing else is shown then. */
const initError = computed<string | null>(() => {
	if (!props.value || !fixedType.value) return null;
	if (fixedType.value === 'hex' && hexErrors(props.value)) return 'Invalid hex format.';
	if (fixedType.value === 'base64' && base64Errors(props.value)) return 'Invalid base64 format.';
	return null;
});

const hexMessage = computed(() => (hexErrors(hexData.value) ? HEX_ERROR_MESSAGE : ''));
const base64Message = computed(() =>
	base64Errors(base64Data.value) || switcherLocked.value ? BASE64_ERROR_MESSAGE : '',
);

if (props.value && fixedType.value === 'file') {
	setFileURL(new Blob([props.value]));
}

onBeforeUnmount(() => setFileURL(null));

function onTypeChange(type: FileType) {
	fileType.value = type;
	if (hexData.value && type === 'base64') fromHexToBase64();
	if (hexData.value && type === 'file') fromHexToFile();
}

function onHexInput(text: string) {
	hexData.value = text;
	dirty.value = true;
	switcherLocked.value = hexErrors(text) !== null;
	emit('fieldChange', text);
}

function onBase64Input(text: string) {
	base64Data.value = text;
	dirty.value = true;
	fromBase64ToHex();
	emit('fieldChange', hexData.value);
}

function onFileSelected(event: Event) {
	const file = (event.target as HTMLInputElement).files?.[0];
	if (!file) return;
	const reader = new FileReader();
	reader.addEventListener('load', () => {
		const buffer = reader.result as ArrayBuffer;
		hexData.value = [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
		fromHexToFile();
		emit('fieldChange', hexData.value);
	});
	reader.readAsArrayBuffer(file);
}

function openFilePicker() {
	fileInput.value?.click();
}

function fromHexToBase64() {
	const pairs = hexData.value.match(/\w{2}/g) ?? [];
	try {
		base64Data.value = btoa(pairs.map((pair) => String.fromCharCode(Number.parseInt(pair, 16))).join(''));
	} catch {
		base64Data.value = '';
	}
}

function fromBase64ToHex() {
	try {
		const raw = atob(base64Data.value);
		let result = '';
		for (let i = 0; i < raw.length; i++) result += raw.charCodeAt(i).toString(16).padStart(2, '0');
		hexData.value = result;
		switcherLocked.value = false;
	} catch {
		switcherLocked.value = true;
	}
}

function fromHexToFile() {
	const bytes = (hexData.value.match(/[\da-f]{2}/gi) ?? []).map((pair) => Number.parseInt(pair, 16));
	setFileURL(new Blob([new Uint8Array(bytes)]));
}

function setFileURL(blob: Blob | null) {
	if (fileURL.value) URL.revokeObjectURL?.(fileURL.value);
	fileURL.value = blob && typeof URL.createObjectURL === 'function' ? URL.createObjectURL(blob) : null;
}
</script>

<template>
	<div class="file-edit">
		<div class="file-edit__header">
			<span class="file-edit__label">{{ normalizedLabel }}<span v-if="required" class="file-edit__required" aria-hidden="true"> *</span></span>
			<template v-if="fixedType">
				<span class="file-edit__type">{{ initError || fixedType }}</span>
			</template>
			<UiSegmented
				v-else
				:model-value="fileType"
				:options="FILE_TYPES"
				:label="`${normalizedLabel} format`"
				size="sm"
				:disabled="switcherLocked"
				@update:model-value="onTypeChange"
			/>
		</div>

		<template v-if="!initError">
			<UiField v-if="fileType === 'hex'" label="Hex" :error="(dirty && hexMessage) || undefined">
				<UiTextarea
					v-custom-validity="hexMessage"
					:name="`${label}-${fieldKey}-hex-content`"
					:model-value="hexData"
					:rows="8"
					mono
					:disabled="disabled"
					:readonly="readonly"
					@update:model-value="onHexInput"
				/>
			</UiField>

			<UiField v-if="fileType === 'base64'" label="Base64" :error="(dirty && base64Message) || undefined">
				<UiTextarea
					v-custom-validity="base64Message"
					:name="`${label}-${fieldKey}-base64-content`"
					:model-value="base64Data"
					:rows="8"
					mono
					:disabled="disabled"
					:readonly="readonly"
					@update:model-value="onBase64Input"
				/>
			</UiField>

			<div v-if="fileType === 'file'" class="file-edit__uploader">
				<input
					ref="fileInput"
					class="file-edit__input"
					type="file"
					:name="`${label}-${fieldKey}-file`"
					:required="required && !hexData"
					:disabled="readonly || disabled"
					:aria-label="`${normalizedLabel} file`"
					@change="onFileSelected"
				>
				<span class="file-edit__status">{{ hexData ? 'File is uploaded.' : 'No file uploaded yet.' }}</span>
				<UiButton variant="secondary" size="sm" :disabled="readonly || disabled" @click="openFilePicker">
					Upload file
				</UiButton>
				<UiButton v-if="hexData && fileURL" variant="secondary" size="sm" :href="fileURL" download>
					Download file
				</UiButton>
			</div>
		</template>
	</div>
</template>

<style scoped>
.file-edit {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.file-edit__header {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-4);
}

.file-edit__label {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--color-ink-soft);
}

.file-edit__required {
  color: var(--color-danger-strong);
}

.file-edit__type {
  font-size: var(--text-sm);
  color: var(--color-ink);
}

.file-edit__uploader {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.file-edit__input {
  display: none;
}

.file-edit__status {
  font-size: var(--text-sm);
  font-style: italic;
  color: var(--color-muted);
}
</style>
