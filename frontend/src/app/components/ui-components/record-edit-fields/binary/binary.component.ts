import { Component, model, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { HexValidationDirective } from 'src/app/directives/hexValidator.directive';
import { hexValidation } from 'src/app/validators/hex.validator';
import { BaseEditFieldComponent } from '../base-row-field/base-row-field.component';

export type BinaryBufferJson = { type: 'Buffer'; data: number[] };

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
		this.hexData = this.normalizeIncomingValueToHex(this.value());
		this.emitCurrentValue();
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
		this.onFieldChange.emit({ type: 'Buffer', data: hexToBytes(this.hexData) });
	}

	private normalizeIncomingValueToHex(value: unknown): string {
		if (value == null) return '';
		if (typeof value === 'string') return value;
		if (typeof value === 'object' && 'data' in (value as Record<string, unknown>)) {
			const data = (value as { data: unknown }).data;
			if (Array.isArray(data)) {
				return (data as number[]).map((b) => b.toString(16).padStart(2, '0')).join('');
			}
		}
		return '';
	}
}

function hexToBytes(hex: string): number[] {
	const bytes: number[] = [];
	for (let i = 0; i < hex.length; i += 2) {
		bytes.push(parseInt(hex.substring(i, i + 2), 16));
	}
	return bytes;
}
