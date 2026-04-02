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

	ngOnInit(): void {
		super.ngOnInit();

		if (this.value?.startsWith('@')) {
			this.filterMode = 'domain';
			this.domainValue = this.value.substring(1);
		}
	}

	ngAfterViewInit(): void {
		if (this.filterMode !== 'eq') {
			this.onComparatorChange.emit(this.filterMode === 'domain' ? 'endswith' : this.filterMode);
		}

		if (this.autofocus && this.inputElement) {
			setTimeout(() => {
				this.inputElement.nativeElement.focus();
			}, 100);
		}
	}

	onFilterModeChange(mode: string): void {
		this.filterMode = mode;

		if (mode === 'domain') {
			this.value = this.domainValue ? `@${this.domainValue}` : '';
			this.onComparatorChange.emit('endswith');
		} else if (mode === 'empty') {
			this.value = '';
			this.onComparatorChange.emit('empty');
		} else {
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

	onValueChange(text: string): void {
		this.value = text;
		this.onFieldChange.emit(this.value);
		this.onComparatorChange.emit(this.filterMode);
	}
}
