import { ClipboardModule } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BaseTableDisplayFieldComponent } from '../base-table-display-field/base-table-display-field.component';

@Component({
	selector: 'app-time-interval-display',
	templateUrl: './time-interval.component.html',
	styleUrls: ['../base-table-display-field/base-table-display-field.component.css', './time-interval.component.css'],
	imports: [ClipboardModule, MatIconModule, MatButtonModule, MatTooltipModule, CommonModule],
})
export class TimeIntervalDisplayComponent extends BaseTableDisplayFieldComponent implements OnInit {
	formattedInterval: string;

	ngOnInit() {
		if (!this.value) {
			this.formattedInterval = '—';
			return;
		}

		try {
			const interval = typeof this.value === 'string' ? JSON.parse(this.value) : this.value;
			let parts = [];

			if (interval.days) parts.push(`${interval.days}d`);
			if (interval.hours) parts.push(`${interval.hours}h`);
			if (interval.minutes) parts.push(`${interval.minutes}m`);
			if (interval.seconds) parts.push(`${interval.seconds}s`);
			if (interval.milliseconds) parts.push(`${interval.milliseconds}ms`);

			this.formattedInterval = parts.length > 0 ? parts.join(' ') : '0';
		} catch (_e) {
			this.formattedInterval = String(this.value);
		}
	}
}
