import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { BaseFilterFieldComponent } from '../base-filter-field/base-filter-field.component';

@Component({
	selector: 'app-filter-email',
	templateUrl: './email.component.html',
	styleUrls: ['./email.component.css'],
	imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule],
})
export class EmailFilterComponent extends BaseFilterFieldComponent implements OnInit, AfterViewInit {
	@Input() value: string;
	@ViewChild('inputElement') inputElement: ElementRef<HTMLInputElement>;

	public filterMode: string = 'eq';
	public domainValue: string = '';
	public textValue: string = '';

	ngOnInit(): void {
		super.ngOnInit();

		if (this.value?.startsWith('@')) {
			this.filterMode = 'domain';
			this.domainValue = this.value.substring(1);
		} else if (this.value) {
			this.textValue = this.value;
		}
	}

	ngAfterViewInit(): void {
		this.emitCurrentState();

		if (this.autofocus && this.inputElement) {
			setTimeout(() => {
				this.inputElement.nativeElement.focus();
			}, 100);
		}
	}

	onFilterModeChange(mode: string): void {
		this.filterMode = mode;

		if (mode === 'empty') {
			this.value = '';
			this.onFieldChange.emit(this.value);
			this.onComparatorChange.emit('empty');
			return;
		}

		if (mode === 'domain') {
			this.value = this.domainValue ? `@${this.domainValue}` : '';
			this.onComparatorChange.emit('endswith');
		} else {
			this.value = this.textValue;
			this.onComparatorChange.emit(mode);
		}

		this.onFieldChange.emit(this.value);
	}

	onDomainChange(domain: string): void {
		this.domainValue = domain;
		this.value = domain ? `@${domain}` : '';
		this.onFieldChange.emit(this.value);
		this.onComparatorChange.emit('endswith');
	}

	onTextChange(text: string): void {
		this.textValue = text;
		this.value = text;
		this.onFieldChange.emit(this.value);
		this.onComparatorChange.emit(this.filterMode);
	}

	private emitCurrentState(): void {
		this.onComparatorChange.emit(this.filterMode === 'domain' ? 'endswith' : this.filterMode);
	}
}
