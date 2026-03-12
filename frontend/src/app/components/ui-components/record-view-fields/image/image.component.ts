import { Component } from '@angular/core';
import { BaseRecordViewFieldComponent } from '../base-record-view-field/base-record-view-field.component';

@Component({
	selector: 'app-image-record-view',
	templateUrl: './image.component.html',
	styleUrls: ['../base-record-view-field/base-record-view-field.component.css', './image.component.css'],
	imports: [],
})
export class ImageRecordViewComponent extends BaseRecordViewFieldComponent {
	get srcValue(): string {
		if (!this.value()) return '';
		const prefix = this.widgetStructure()?.widget_params?.prefix || '';
		return prefix + this.value();
	}

	get isUrl(): boolean {
		if (!this.value()) return false;
		try {
			// Check if the prefixed URL is valid
			new URL(this.srcValue);
			return true;
		} catch {
			return false;
		}
	}
}
