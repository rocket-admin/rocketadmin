import { AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { HexValidationDirective } from 'src/app/directives/hexValidator.directive';
import { BaseFilterFieldComponent } from '../base-filter-field/base-filter-field.component';

export type BinaryFilterMode = 'eq' | 'contains' | 'startswith' | 'empty';

@Component({
	selector: 'app-filter-binary',
	templateUrl: './binary.component.html',
	styleUrls: ['./binary.component.css'],
	imports: [FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, HexValidationDirective],
})
export class BinaryFilterComponent extends BaseFilterFieldComponent implements OnInit, AfterViewInit {
	@Input() value: string;
	@ViewChild('inputElement') inputElement: ElementRef<HTMLInputElement>;

	public filterMode: BinaryFilterMode = 'eq';
	public hexValue = '';

	override ngOnInit(): void {
		if (this.value) this.hexValue = this.value;
	}

	ngAfterViewInit(): void {
		if (this.autofocus() && this.inputElement) {
			setTimeout(() => this.inputElement.nativeElement.focus(), 100);
		}
	}

	onFilterModeChange(mode: BinaryFilterMode): void {
		this.filterMode = mode;
		if (mode === 'empty') {
			this.hexValue = '';
			this.onComparatorChange.emit('empty');
			this.onFieldChange.emit('');
			return;
		}
		this.onComparatorChange.emit(mode);
		this.onFieldChange.emit(this.hexValue);
	}

	onHexValueChange(hex: string): void {
		this.hexValue = hex;
		this.onFieldChange.emit(hex);
		this.onComparatorChange.emit(this.filterMode);
	}
}
