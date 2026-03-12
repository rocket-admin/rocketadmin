import { CommonModule } from '@angular/common';
import { Component, model, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { UrlValidatorDirective } from 'src/app/directives/url-validator.directive';
import { BaseEditFieldComponent } from '../base-row-field/base-row-field.component';

@Component({
	selector: 'app-edit-url',
	imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, UrlValidatorDirective],
	templateUrl: './url.component.html',
	styleUrl: './url.component.css',
})
export class UrlEditComponent extends BaseEditFieldComponent implements OnInit {
	readonly value = model<string>();
	public prefix: string = '';

	ngOnInit(): void {
		super.ngOnInit();
		this._parseWidgetParams();
	}

	ngOnChanges(): void {
		this._parseWidgetParams();
	}

	private _parseWidgetParams(): void {
		const ws = this.widgetStructure();
		if (ws?.widget_params) {
			try {
				const params = typeof ws.widget_params === 'string' ? JSON.parse(ws.widget_params) : ws.widget_params;

				if (params.prefix !== undefined) {
					this.prefix = params.prefix || '';
				}
			} catch (e) {
				console.error('Error parsing URL widget params:', e);
			}
		}
	}
}
