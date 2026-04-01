import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { BaseFilterFieldComponent } from '../base-filter-field/base-filter-field.component';

@Component({
	selector: 'app-filter-email',
	templateUrl: './email.component.html',
	styleUrls: ['./email.component.css'],
	imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule],
})
export class EmailFilterComponent extends BaseFilterFieldComponent implements OnInit, AfterViewInit {
	@Input() value: string;
	@ViewChild('inputElement') inputElement: ElementRef<HTMLInputElement>;

	public domainValue: string = '';

	ngOnInit(): void {
		super.ngOnInit();
		this.onComparatorChange.emit('endswith');

		if (this.value?.startsWith('@')) {
			this.domainValue = this.value.substring(1);
		} else if (this.value) {
			this.domainValue = this.value;
		}
	}

	ngAfterViewInit(): void {
		if (this.autofocus && this.inputElement) {
			setTimeout(() => {
				this.inputElement.nativeElement.focus();
			}, 100);
		}
	}

	onDomainChange(domain: string): void {
		this.domainValue = domain;
		if (domain) {
			this.value = `@${domain}`;
		} else {
			this.value = '';
		}
		this.onFieldChange.emit(this.value);
		this.onComparatorChange.emit('endswith');
	}
}
