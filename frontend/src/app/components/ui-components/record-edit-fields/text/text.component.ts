import { CommonModule } from '@angular/common';
import { Component, model, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TextValidatorDirective } from 'src/app/directives/text-validator.directive';
import { BaseEditFieldComponent } from '../base-row-field/base-row-field.component';

@Component({
	selector: 'app-edit-text',
	templateUrl: './text.component.html',
	styleUrls: ['./text.component.css'],
	imports: [CommonModule, MatFormFieldModule, MatInputModule, FormsModule, TextValidatorDirective],
})
export class TextEditComponent extends BaseEditFieldComponent implements OnInit {
	readonly value = model<string>();

	static type = 'text';

	maxLength: number | null = null;
	validateType: string | null = null;
	regexPattern: string | null = null;
	forceSendEmptyString: boolean = false;

	override ngOnInit(): void {
		super.ngOnInit();

		const struct = this.structure();
		if (struct?.character_maximum_length) {
			this.maxLength = struct.character_maximum_length;
		}

		const ws = this.widgetStructure();
		if (ws?.widget_params) {
			const params = typeof ws.widget_params === 'string' ? JSON.parse(ws.widget_params) : ws.widget_params;

			this.validateType = params.validate || null;
			this.regexPattern = params.regex || null;
			this.forceSendEmptyString = !!params.force_send_empty_string;
		}
	}

	handleValueChange(v: string | null): void {
		if (v === '' && !this.forceSendEmptyString && this.structure()?.allow_null === true) {
			this.onFieldChange.emit(null);
			return;
		}
		this.onFieldChange.emit(v);
	}

	getValidationErrorMessage(): string {
		if (!this.validateType) {
			return '';
		}

		if (this.validateType === 'regex') {
			return "Value doesn't match the required pattern";
		}

		const messages = {
			isEmail: 'Invalid email address',
			isURL: 'Invalid URL',
			isIP: 'Invalid IP address',
			isUUID: 'Invalid UUID',
			isJSON: 'Invalid JSON',
			isCreditCard: 'Invalid credit card number',
			isISBN: 'Invalid ISBN',
			isAlpha: 'Should contain only letters',
			isNumeric: 'Should contain only numbers',
			isAlphanumeric: 'Should contain only letters and numbers',
			isHexColor: 'Invalid hex color',
			isBase64: 'Invalid Base64 string',
			isMobilePhone: 'Invalid mobile phone number',
			isMACAddress: 'Invalid MAC address',
			isPostalCode: 'Invalid postal code',
			isCurrency: 'Invalid currency format',
		};

		return messages[this.validateType] || `Invalid ${this.validateType}`;
	}
}
