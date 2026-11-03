// The timezone list of filter-fields/timezone, built once per page load from the Intl API.
import type { SelectOption } from '@/components/ui';

/** `+HH:MM` / `-HH:MM` for a timezone right now, `''` when the runtime can't resolve it. */
export function getTimezoneOffset(timezone: string): string {
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

export const BASE_TIMEZONES: SelectOption<string>[] = Intl.supportedValuesOf('timeZone')
	.map((tz) => ({ value: tz, label: `${tz} (UTC${getTimezoneOffset(tz)})` }))
	.sort((a, b) => a.value.localeCompare(b.value));
