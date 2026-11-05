<script setup lang="ts">
/**
 * Port of record-edit-fields/date-time (`DateTimeEditComponent`): a timestamp edited as a date and
 * a time input side by side. Emitted as `yyyy-MM-dd HH:mm:ss` for MySQL and as
 * `yyyy-MM-ddTHH:mm:ssZ` for every other database; picking a date with no time yet uses midnight.
 */
import { format } from 'date-fns';
import { ref } from 'vue';
import { UiField, UiInput } from '@/components/ui';
import { DBtype } from '@/models/connection';
import { useConnectionsStore } from '@/stores/connections';
import type { RecordEditFieldEmits, RecordEditFieldProps } from '../types';
import { useRecordEditField } from '../useFieldWidget';

const props = defineProps<RecordEditFieldProps & { value?: string | null }>();
const emit = defineEmits<RecordEditFieldEmits>();

const { normalizedLabel } = useRecordEditField(props);
const connections = useConnectionsStore();

const initial = props.value ? new Date(props.value) : null;
const date = ref(initial ? format(initial, 'yyyy-MM-dd') : '');
const time = ref(initial ? format(initial, 'HH:mm:ss') : '');

function onDateInput(value: string) {
	date.value = value;
	if (!time.value) time.value = '00:00:00';
	emitDatetime();
}

function onTimeInput(value: string) {
	time.value = value;
	emitDatetime();
}

function emitDatetime() {
	const datetime =
		connections.connection.type === DBtype.MySQL ? `${date.value} ${time.value}` : `${date.value}T${time.value}Z`;
	emit('fieldChange', datetime);
}
</script>

<template>
	<div class="date-time-edit">
		<UiField :label="`${normalizedLabel} (date)`" :required="required">
			<UiInput
				type="date"
				:name="`${label}-${fieldKey}-date`"
				:model-value="date"
				:disabled="disabled"
				:readonly="readonly"
				:data-testid="`record-${label}-date`"
				@update:model-value="onDateInput"
			/>
		</UiField>
		<UiField :label="`${normalizedLabel} (time)`" :required="required">
			<UiInput
				type="time"
				step="1"
				:name="`${label}-${fieldKey}-time`"
				:model-value="time"
				:disabled="disabled"
				:readonly="readonly"
				:data-testid="`record-${label}-time`"
				@update:model-value="onTimeInput"
			/>
		</UiField>
	</div>
</template>

<style scoped>
.date-time-edit {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}
</style>
