import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { format, subDays, subHours, subMonths, subYears } from 'date-fns';
import { BaseFilterFieldComponent } from '../base-filter-field/base-filter-field.component';

@Component({
	selector: 'app-filter-date-time',
	templateUrl: './date-time.component.html',
	styleUrls: ['./date-time.component.css'],
	imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule],
})
export class DateTimeFilterComponent extends BaseFilterFieldComponent implements OnInit, AfterViewInit {
	@Input() value: string | string[];
	@ViewChild('inputElement') inputElement: ElementRef<HTMLInputElement>;

	public filterMode: string = 'last_day';
	public date: string;
	public time: string;

	public lowerDate: string;
	public lowerTime: string;
	public upperDate: string;
	public upperTime: string;

	public inValueText: string = '';

	private _presetModes = ['last_hour', 'last_day', 'last_week', 'last_month', 'last_year'];

	ngOnInit(): void {
		if (this.filterMode === 'between' && Array.isArray(this.value)) {
			this._restoreBetween(this.value);
			return;
		}

		if (this.filterMode === 'in' && Array.isArray(this.value)) {
			this.inValueText = this.value.join(', ');
			return;
		}

		if (typeof this.value === 'string' && this.value) {
			const datetime = new Date(this.value);
			this.date = format(datetime, 'yyyy-MM-dd');
			this.time = format(datetime, 'HH:mm:ss');
			this.filterMode = 'gte';
		}
	}

	ngAfterViewInit(): void {
		if (this.filterMode === 'between' || this.filterMode === 'in') {
			this.onComparatorChange.emit(this.filterMode);
		} else if (this.value) {
			this.onComparatorChange.emit(this.filterMode);
		} else {
			const value = this._computePresetValue(this.filterMode);
			this.onFieldChange.emit(value);
			this.onComparatorChange.emit('gte');
		}

		if (this.autofocus() && this.inputElement) {
			setTimeout(() => {
				this.inputElement.nativeElement.focus();
			}, 100);
		}
	}

	onFilterModeChange(mode: string): void {
		const previous = this.filterMode;
		this.filterMode = mode;

		if (this._presetModes.includes(mode)) {
			const value = this._computePresetValue(mode);
			this.onFieldChange.emit(value);
			this.onComparatorChange.emit('gte');
			return;
		}

		if (mode === 'in' || mode === 'between') {
			if (previous !== mode) {
				this.inValueText = '';
				this.lowerDate = undefined;
				this.lowerTime = undefined;
				this.upperDate = undefined;
				this.upperTime = undefined;
				this.onFieldChange.emit(undefined);
			}
			this.onComparatorChange.emit(mode);
			return;
		}

		this.onComparatorChange.emit(mode);
		if (this.date) {
			const time = this.time || '00:00';
			const datetime = `${this.date}T${time}Z`;
			this.onFieldChange.emit(datetime);
		}
	}

	onDateChange(): void {
		if (!this.time) this.time = '00:00:00';
		const datetime = `${this.date}T${this.time}Z`;
		this.onFieldChange.emit(datetime);
		this.onComparatorChange.emit(this.filterMode);
	}

	onTimeChange(): void {
		const datetime = `${this.date}T${this.time}Z`;
		this.onFieldChange.emit(datetime);
		this.onComparatorChange.emit(this.filterMode);
	}

	onBetweenLowerChange(): void {
		const lower = this._composeDateTime(this.lowerDate, this.lowerTime);
		const upper = this._composeDateTime(this.upperDate, this.upperTime);
		this.onFieldChange.emit([lower, upper]);
		this.onComparatorChange.emit('between');
	}

	onBetweenUpperChange(): void {
		const lower = this._composeDateTime(this.lowerDate, this.lowerTime);
		const upper = this._composeDateTime(this.upperDate, this.upperTime);
		this.onFieldChange.emit([lower, upper]);
		this.onComparatorChange.emit('between');
	}

	onInTextChange(text: string): void {
		this.inValueText = text;
		const parts = text
			.split(',')
			.map((v) => v.trim())
			.filter((v) => v.length > 0);

		if (parts.length === 0) {
			this.onFieldChange.emit(undefined);
			return;
		}

		this.onFieldChange.emit(parts);
		this.onComparatorChange.emit('in');
	}

	isPresetMode(): boolean {
		return this._presetModes.includes(this.filterMode);
	}

	private _restoreBetween(value: string[]): void {
		if (value[0]) {
			const lower = new Date(value[0]);
			this.lowerDate = format(lower, 'yyyy-MM-dd');
			this.lowerTime = format(lower, 'HH:mm:ss');
		}
		if (value[1]) {
			const upper = new Date(value[1]);
			this.upperDate = format(upper, 'yyyy-MM-dd');
			this.upperTime = format(upper, 'HH:mm:ss');
		}
	}

	private _composeDateTime(date: string, time: string): string | null {
		if (!date) return null;
		const t = time || '00:00:00';
		return `${date}T${t}Z`;
	}

	private _computePresetValue(mode: string): string {
		const now = new Date();
		let targetDate: Date;

		switch (mode) {
			case 'last_hour':
				targetDate = subHours(now, 1);
				break;
			case 'last_day':
				targetDate = subDays(now, 1);
				break;
			case 'last_week':
				targetDate = subDays(now, 7);
				break;
			case 'last_month':
				targetDate = subMonths(now, 1);
				break;
			case 'last_year':
				targetDate = subYears(now, 1);
				break;
			default:
				targetDate = now;
		}

		return targetDate.toISOString().replace(/\.\d{3}Z$/, 'Z');
	}
}
