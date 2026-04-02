import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import { BaseFilterFieldComponent } from '../base-filter-field/base-filter-field.component';

function getTimezoneOffset(timezone: string): string {
	try {
		const now = new Date();
		const formatter = new Intl.DateTimeFormat('en-US', {
			timeZone: timezone,
			timeZoneName: 'longOffset',
		});

		const parts = formatter.formatToParts(now);
		const offsetPart = parts.find((part) => part.type === 'timeZoneName');

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
	} catch (_error) {
		return '';
	}
}

const BASE_TIMEZONES: { value: string; label: string }[] = Intl.supportedValuesOf('timeZone')
	.map((tz) => ({
		value: tz,
		label: `${tz} (UTC${getTimezoneOffset(tz)})`,
	}))
	.sort((a, b) => a.value.localeCompare(b.value));

@Component({
	selector: 'app-filter-timezone',
	imports: [CommonModule, FormsModule, MatFormFieldModule, MatSelectModule],
	templateUrl: './timezone.component.html',
	styleUrls: ['./timezone.component.css'],
	schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class TimezoneFilterComponent extends BaseFilterFieldComponent {
	@Input() value: string;

	public timezones: { value: string; label: string }[] = [];

	originalOrder = () => {
		return 0;
	};

	static type = 'timezone';

	ngOnInit(): void {
		const ws = this.widgetStructure();
		const struct = this.structure();
		if (ws?.widget_params?.allow_null || struct?.allow_null) {
			this.timezones = [{ value: null, label: '' }, ...BASE_TIMEZONES];
		} else {
			this.timezones = BASE_TIMEZONES;
		}
	}
}
