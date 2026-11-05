<script setup lang="ts">
/** Port of table-display-fields/timezone (`TimezoneDisplayComponent`): an IANA zone with its current UTC offset. */
import { computed } from 'vue';
import type { TableDisplayFieldProps, ViewFieldEmits } from '../types';
import { useViewField } from '../useFieldWidget';
import TableDisplayCell from './TableDisplayCell.vue';

const props = defineProps<TableDisplayFieldProps & { value?: string | null }>();
const emit = defineEmits<ViewFieldEmits>();

const { copy } = useViewField(props, emit);

const formattedTimezone = computed(() => {
	if (!props.value) return '—';
	return `${props.value} (UTC${timezoneOffset(props.value)})`;
});

/** `+05:30` / `-04:00` for the zone right now; `''` for an unknown zone. */
function timezoneOffset(timezone: string): string {
	try {
		const now = new Date();
		const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, timeZoneName: 'longOffset' }).formatToParts(
			now,
		);
		const offsetPart = parts.find((part) => part.type === 'timeZoneName');
		if (offsetPart?.value.includes('GMT')) {
			const offset = offsetPart.value.replace('GMT', '');
			return offset === '' ? '+00:00' : offset;
		}
		// Fallback: compute the offset by hand.
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
	<TableDisplayCell @copy="copy(value, 'Timezone was copied to clipboard.')">{{ formattedTimezone }}</TableDisplayCell>
</template>
