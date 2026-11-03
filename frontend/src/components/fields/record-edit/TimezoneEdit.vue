<script setup lang="ts">
/**
 * Port of record-edit-fields/timezone (`TimezoneEditComponent`): an IANA timezone picked from the
 * browser's `Intl` list, each labelled with its current UTC offset.
 */
import { computed, ref } from 'vue';
import { type SelectOption, UiField, UiSelect } from '@/components/ui';
import type { RecordEditFieldEmits, RecordEditFieldProps } from '../types';
import { useRecordEditField } from '../useFieldWidget';

const props = defineProps<RecordEditFieldProps & { value?: string | null }>();
const emit = defineEmits<RecordEditFieldEmits>();

const { normalizedLabel, widgetParams } = useRecordEditField(props);

const selected = ref<string | null>(props.value ?? null);

/** Computed once: building ~400 `Intl.DateTimeFormat`s per render would be wasteful. */
const allTimezones: SelectOption<string | null>[] = Intl.supportedValuesOf('timeZone')
	.map((tz) => ({ value: tz, label: `${tz} (UTC${getTimezoneOffset(tz)})` }))
	.sort((a, b) => a.value.localeCompare(b.value));

const timezones = computed<SelectOption<string | null>[]>(() =>
	widgetParams.value.allow_null || props.structure?.allow_null
		? [{ value: null, label: '' }, ...allTimezones]
		: allTimezones,
);

function onChange(value: string | null | (string | null)[]) {
	if (Array.isArray(value)) return;
	selected.value = value;
	emit('fieldChange', value);
}

/** `+HH:MM` for the zone right now, from `longOffset` ("GMT+05:30"), with a manual fallback. */
function getTimezoneOffset(timezone: string): string {
	try {
		const now = new Date();
		const formatter = new Intl.DateTimeFormat('en-US', { timeZone: timezone, timeZoneName: 'longOffset' });
		const offsetPart = formatter.formatToParts(now).find((part) => part.type === 'timeZoneName');

		if (offsetPart?.value.includes('GMT')) {
			const offset = offsetPart.value.replace('GMT', '');
			return offset === '' ? '+00:00' : offset;
		}

		const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
		const tzDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
		const offsetMinutes = (tzDate.getTime() - utcDate.getTime()) / 60000;
		const hours = Math.floor(Math.abs(offsetMinutes) / 60);
		const minutes = Math.abs(offsetMinutes) % 60;
		const sign = offsetMinutes >= 0 ? '+' : '-';
		return `${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
	} catch {
		return '';
	}
}
</script>

<template>
	<UiField class="timezone-edit" :label="normalizedLabel" :required="required">
		<UiSelect
			:name="`${label}-${fieldKey}`"
			:model-value="selected"
			:options="timezones"
			:disabled="disabled || readonly"
			:data-testid="`record-${label}-timezone`"
			@update:model-value="onChange"
		/>
	</UiField>
</template>
