import { Component, computed, model, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Base64ValidationDirective } from 'src/app/directives/base64Validator.directive';
import { HexValidationDirective } from 'src/app/directives/hexValidator.directive';
import {
	BinaryBufferJson,
	bytesToEncoded,
	encodedToBytes,
	isBinaryEncoding,
	parseBinaryValue,
	toBufferJson,
} from 'src/app/lib/binary';
import { BaseEditFieldComponent } from '../base-row-field/base-row-field.component';

@Component({
	selector: 'app-edit-binary',
	templateUrl: './binary.component.html',
	styleUrls: ['./binary.component.css'],
	imports: [FormsModule, MatFormFieldModule, MatInputModule, HexValidationDirective, Base64ValidationDirective],
})
export class BinaryEditComponent extends BaseEditFieldComponent implements OnInit {
	readonly value = model<string | BinaryBufferJson | null>();

	static type = 'file';

	public rawInput = '';
	public isInvalidInput = false;

	public readonly encoding = computed(() => {
		const raw = this.widgetStructure()?.widget_params?.encoding;
		return isBinaryEncoding(raw) ? raw : 'hex';
	});

	ngOnInit(): void {
		super.ngOnInit();
		this.rawInput = bytesToEncoded(parseBinaryValue(this.value()), this.encoding());
	}

	onInputChange(): void {
		if (!this.rawInput) {
			this.isInvalidInput = false;
			this.onFieldChange.emit(null);
			return;
		}
		const bytes = encodedToBytes(this.rawInput, this.encoding());
		if (bytes === null) {
			this.isInvalidInput = true;
			this.onFieldChange.emit(this.rawInput);
			return;
		}
		this.isInvalidInput = false;
		this.onFieldChange.emit(toBufferJson(bytes));
	}
}
