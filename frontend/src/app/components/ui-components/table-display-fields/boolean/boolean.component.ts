import { ClipboardModule } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import { Component, Injectable } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BaseTableDisplayFieldComponent } from '../base-table-display-field/base-table-display-field.component';

@Injectable()
@Component({
	selector: 'app-display-boolean',
	templateUrl: './boolean.component.html',
	styleUrls: ['../base-table-display-field/base-table-display-field.component.css', './boolean.component.css'],
	imports: [ClipboardModule, MatIconModule, MatButtonModule, MatTooltipModule, CommonModule],
})
export class BooleanDisplayComponent extends BaseTableDisplayFieldComponent {
	get invertColors(): boolean {
		// Parse widget parameters if available
		if (this.widgetStructure?.widget_params) {
			const params =
				typeof this.widgetStructure.widget_params === 'string'
					? JSON.parse(this.widgetStructure.widget_params)
					: this.widgetStructure.widget_params;

			return params?.invert_colors === true;
		}
		return false;
	}
}
