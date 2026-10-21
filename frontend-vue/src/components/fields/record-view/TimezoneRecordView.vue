<script setup lang="ts">
/** Port of record-view-fields/timezone (`TimezoneRecordViewComponent`): an IANA zone with its current UTC offset. */
import { computed } from 'vue';
import type { RecordViewFieldProps, ViewFieldEmits } from '../types';
import RecordViewValue from './RecordViewValue.vue';

const props = defineProps<RecordViewFieldProps & { value?: string | null }>();
defineEmits<ViewFieldEmits>();

const formattedTimezone = computed(() => {
	if (!props.value) return '—';
	return `${props.value} (UTC${getTimezoneOffset(props.value)})`;
});

/** `+05:30`-style offset of `timezone` right now; `''` for an unknown zone. */
function getTimezoneOffset(timezone: string): string {
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

		// Fallback: calculate the offset manually
		const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
		const tzDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
		const offsetMinutes = (tzDate.getTime() - utcDate.getTime()) / 60000;
		const hours = Math.floor(Math.abs(offsetMinutes) / 60);
		const minutes = Math.abs(offsetMinutes) % 60;
		const sign = offsetMinutes >= 0 ? '+' : '-';
		return `${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
	} catch (error) {
		console.error(error);
		return '';
	}
}
</script>

<template>
	<RecordViewValue>{{ formattedTimezone }}</RecordViewValue>
</template>
