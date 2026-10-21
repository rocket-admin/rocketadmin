<script setup lang="ts">
/**
 * Port of record-edit-fields/uuid (`UuidEditComponent`): a UUID column. A new row (empty value)
 * gets a UUID of `widget_params.version` (v1/v3/v4/v5/v7, default v4) on mount; v3/v5 hash
 * `widget_params.name` (or the current timestamp) in `widget_params.namespace` (default DNS).
 */
import {
	validate as uuidValidate,
	version as uuidVersion,
	v1 as uuidv1,
	v3 as uuidv3,
	v4 as uuidv4,
	v5 as uuidv5,
	v7 as uuidv7,
} from 'uuid';
import { computed, onMounted, ref } from 'vue';
import { UiField, UiIcon, UiIconButton, UiInput } from '@/components/ui';
import type { RecordEditFieldEmits, RecordEditFieldProps } from '../types';
import { useRecordEditField } from '../useFieldWidget';

/** The DNS namespace from RFC 4122. */
const DEFAULT_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

const props = defineProps<RecordEditFieldProps & { value?: string | null }>();
const emit = defineEmits<RecordEditFieldEmits>();

const { normalizedLabel, widgetParams } = useRecordEditField(props);

const uuid = ref(props.value ?? '');

const version = computed<string>(() => widgetParams.value.version || 'v4');
const namespace = computed<string>(() => widgetParams.value.namespace || DEFAULT_NAMESPACE);
const name = computed<string>(() => widgetParams.value.name || '');
const editable = computed(() => !props.readonly && !props.disabled);

const isValid = computed(() => Boolean(uuid.value) && uuidValidate(uuid.value));

const hint = computed(() => {
	if (!isValid.value) return undefined;
	const detected = getUuidVersion(uuid.value);
	return `UUID ${detected ? `v${detected}` : 'version unknown'}`;
});

/** Angular rendered this `mat-error` but no validator ever put the control in an error state. */
const error = computed(() => (uuid.value && !isValid.value ? 'Invalid UUID format' : undefined));

onMounted(() => {
	if (!props.value) generateUuid();
});

function onInput(value: string) {
	uuid.value = value;
	emit('fieldChange', value);
}

function generateUuid() {
	try {
		uuid.value = createUuid();
	} catch (error) {
		console.error('Error generating UUID:', error);
		uuid.value = uuidv4();
	}
	emit('fieldChange', uuid.value);
}

function createUuid(): string {
	switch (version.value) {
		case 'v1':
			return uuidv1();
		case 'v3':
			return uuidv3(name.value || Date.now().toString(), namespace.value);
		case 'v5':
			return uuidv5(name.value || Date.now().toString(), namespace.value);
		case 'v7':
			return uuidv7();
		default:
			return uuidv4();
	}
}

function getUuidVersion(value: string): number | false {
	try {
		return uuidVersion(value);
	} catch {
		return false;
	}
}
</script>

<template>
	<div class="uuid-edit">
		<UiField :label="normalizedLabel" :required="required" :hint="hint" :error="error">
			<div class="uuid-edit__control">
				<UiInput
					class="uuid-edit__input"
					:name="`${label}-${fieldKey}`"
					:model-value="uuid"
					:disabled="disabled"
					:readonly="readonly"
					placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
					:data-testid="`record-${label}-uuid`"
					@update:model-value="onInput"
				/>
				<UiIconButton v-if="editable" icon="refresh" label="Generate new UUID" @click="generateUuid" />
			</div>
		</UiField>

		<p v-if="editable && (version === 'v3' || version === 'v5')" class="uuid-edit__info">
			<UiIcon name="info" size="sm" />
			<span>UUID {{ version }} uses namespace/name hashing. Configure these in widget parameters.</span>
		</p>
	</div>
</template>

<style scoped>
.uuid-edit {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.uuid-edit__control {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.uuid-edit__input {
  font-family: var(--font-mono);
}

.uuid-edit__info {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
  padding: var(--space-2);
  border-radius: var(--radius-control);
  background: var(--color-paper-2);
  font-size: var(--text-xs);
  color: var(--color-muted);
}
</style>
