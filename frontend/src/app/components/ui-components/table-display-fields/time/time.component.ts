import { ClipboardModule } from '@angular/cdk/clipboard';
import { Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { format } from 'date-fns';
import { BaseTableDisplayFieldComponent } from '../base-table-display-field/base-table-display-field.component';

@Component({
	selector: 'app-time-display',
	templateUrl: './time.component.html',
	styleUrls: ['../base-table-display-field/base-table-display-field.component.css', './time.component.css'],
	imports: [ClipboardModule, MatIconModule, MatButtonModule, MatTooltipModule],
})
export class TimeDisplayComponent extends BaseTableDisplayFieldComponent implements OnInit {
	static type = 'time';

	public formattedTime: string;

	ngOnInit(): void {
		if (this.value) {
			try {
				if (this.value.includes(':')) {
					// Handle time string format
					this.formattedTime = this.value;
				} else {
					const date = new Date(this.value);
					if (!Number.isNaN(date.getTime())) {
						this.formattedTime = format(date, 'HH:mm:ss');
					} else {
						this.formattedTime = this.value;
					}
				}
			} catch (_error) {
				this.formattedTime = this.value;
			}
		}
	}
}
