import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { BaseRecordViewFieldComponent } from '../base-record-view-field/base-record-view-field.component';

@Component({
	selector: 'app-url-record-view',
	templateUrl: './url.component.html',
	styleUrls: ['../base-record-view-field/base-record-view-field.component.css', './url.component.css'],
	imports: [MatIconModule],
})
export class UrlRecordViewComponent extends BaseRecordViewFieldComponent {
	static type = 'url';

	get isValidUrl(): boolean {
		if (!this.value()) return false;
		try {
			new URL(this.value());
			return true;
		} catch {
			return false;
		}
	}
}
