import { CommonModule } from '@angular/common';
import { Component, computed, model, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { UrlValidatorDirective } from 'src/app/directives/url-validator.directive';
import { BaseEditFieldComponent } from '../base-row-field/base-row-field.component';

@Component({
	selector: 'app-edit-image',
	templateUrl: './image.component.html',
	styleUrl: './image.component.css',
	imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, UrlValidatorDirective],
})
export class ImageEditComponent extends BaseEditFieldComponent implements OnInit {
	readonly value = model<string>();
	public prefix: string = '';

	ngOnInit(): void {
		super.ngOnInit();
		this._parseWidgetParams();
	}

	ngOnChanges(): void {
		this._parseWidgetParams();
	}

	get imageUrl(): string {
		const val = this.value();
		if (!val) return '';
		return this.prefix + val;
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
				console.error('Error parsing Image widget params:', e);
			}
		}
	}
}
