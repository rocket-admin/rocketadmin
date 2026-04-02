import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, Input, output, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { format } from 'date-fns';
import { BaseFilterFieldComponent } from '../base-filter-field/base-filter-field.component';

@Component({
	selector: 'app-filter-date-time',
	templateUrl: './date-time.component.html',
	styleUrls: ['./date-time.component.css'],
	imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule],
})
export class DateTimeFilterComponent extends BaseFilterFieldComponent implements AfterViewInit {
	@Input() value: string;
	@ViewChild('inputElement') inputElement: ElementRef<HTMLInputElement>;

	override readonly onFieldChange = output<any>();

	static type = 'datetime';
	public date: string;
	public time: string;

	ngOnInit(): void {
		if (this.value) {
			const datetime = new Date(this.value);
			this.date = format(datetime, 'yyyy-MM-dd');
			this.time = format(datetime, 'HH:mm:ss');
		}
	}

	onDateChange() {
		if (!this.time) this.time = '00:00';
		const datetime = `${this.date}T${this.time}Z`;
		this.onFieldChange.emit(datetime);
	}

	onTimeChange() {
		const datetime = `${this.date}T${this.time}Z`;
		this.onFieldChange.emit(datetime);
	}

	ngAfterViewInit(): void {
		if (this.autofocus() && this.inputElement) {
			setTimeout(() => {
				this.inputElement.nativeElement.focus();
			}, 100);
		}
	}
}
