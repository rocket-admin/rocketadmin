import { AfterViewInit, Component, computed, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Base64ValidationDirective } from 'src/app/directives/base64Validator.directive';
import { HexValidationDirective } from 'src/app/directives/hexValidator.directive';
import { bytesToEncoded, bytesToHex, encodedToBytes, hexStringToBytes, isBinaryEncoding } from 'src/app/lib/binary';
import { BaseFilterFieldComponent } from '../base-filter-field/base-filter-field.component';

export type BinaryFilterMode = 'eq' | 'contains' | 'startswith' | 'empty';

@Component({
	selector: 'app-filter-binary',
	templateUrl: './binary.component.html',
	styleUrls: ['./binary.component.css'],
	imports: [
		FormsModule,
		MatFormFieldModule,
		MatInputModule,
		MatSelectModule,
		HexValidationDirective,
		Base64ValidationDirective,
	],
})
export class BinaryFilterComponent extends BaseFilterFieldComponent implements OnInit, AfterViewInit {
	@Input() value: string;
	@ViewChild('inputElement') inputElement: ElementRef<HTMLInputElement>;

	public filterMode: BinaryFilterMode = 'eq';
	public rawInput = '';
	public isInvalidInput = false;

	public readonly encoding = computed(() => {
		const raw = this.widgetStructure()?.widget_params?.encoding;
		return isBinaryEncoding(raw) ? raw : 'hex';
	});

	override ngOnInit(): void {
		const incomingBytes = hexStringToBytes(this.value ?? '');
		this.rawInput = bytesToEncoded(incomingBytes, this.encoding());
	}

	ngAfterViewInit(): void {
		if (this.autofocus() && this.inputElement) {
			setTimeout(() => this.inputElement.nativeElement.focus(), 100);
		}
	}

	onFilterModeChange(mode: BinaryFilterMode): void {
		this.filterMode = mode;
		if (mode === 'empty') {
			this.rawInput = '';
			this.isInvalidInput = false;
			this.onComparatorChange.emit('empty');
			this.onFieldChange.emit('');
			return;
		}
		this.onComparatorChange.emit(mode);
		this.onFieldChange.emit(this.currentHex());
	}

	onInputChange(value: string): void {
		this.rawInput = value;
		this.onFieldChange.emit(this.currentHex());
		this.onComparatorChange.emit(this.filterMode);
	}

	private currentHex(): string {
		if (!this.rawInput) {
			this.isInvalidInput = false;
			return '';
		}
		const bytes = encodedToBytes(this.rawInput, this.encoding());
		if (bytes === null) {
			this.isInvalidInput = true;
			return '';
		}
		this.isInvalidInput = false;
		return bytesToHex(bytes);
	}
}
