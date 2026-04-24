import { Component, model, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { HexValidationDirective } from 'src/app/directives/hexValidator.directive';
import { BinaryBufferJson, bytesToHex, hexStringToBytes, parseBinaryValue, toBufferJson } from 'src/app/lib/binary';
import { hexValidation } from 'src/app/validators/hex.validator';
import { BaseEditFieldComponent } from '../base-row-field/base-row-field.component';

@Component({
	selector: 'app-edit-binary',
	templateUrl: './binary.component.html',
	styleUrls: ['./binary.component.css'],
	imports: [FormsModule, MatFormFieldModule, MatInputModule, HexValidationDirective],
})
export class BinaryEditComponent extends BaseEditFieldComponent implements OnInit {
	readonly value = model<string | BinaryBufferJson | null>();

	static type = 'file';

	public hexData = '';
	public isInvalidInput = false;

	ngOnInit(): void {
		super.ngOnInit();
		this.hexData = bytesToHex(parseBinaryValue(this.value()));
	}

	onHexChange(): void {
		this.isInvalidInput = !!hexValidation()({ value: this.hexData } as never);
		this.emitCurrentValue();
	}

	private emitCurrentValue(): void {
		if (!this.hexData) {
			this.onFieldChange.emit(null);
			return;
		}
		if (this.isInvalidInput) {
			this.onFieldChange.emit(this.hexData);
			return;
		}
		this.onFieldChange.emit(toBufferJson(hexStringToBytes(this.hexData)));
	}
}
