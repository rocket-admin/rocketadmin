import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, Input, OnInit, Type } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { DynamicModule } from 'ng-dynamic-component';
import { SignalComponentIoModule } from 'ng-dynamic-component/signal-component-io';
import { BaseFilterFieldComponent } from '../base-filter-field/base-filter-field.component';

const TEXT_COMPARATORS = [
	{ value: 'startswith', label: 'starts with' },
	{ value: 'endswith', label: 'ends with' },
	{ value: 'eq', label: 'equal' },
	{ value: 'contains', label: 'contains' },
	{ value: 'icontains', label: 'not contains' },
	{ value: 'empty', label: 'is empty' },
];

const NUMBER_COMPARATORS = [
	{ value: 'eq', label: 'equal' },
	{ value: 'gt', label: 'greater than' },
	{ value: 'lt', label: 'less than' },
	{ value: 'gte', label: 'greater than or equal' },
	{ value: 'lte', label: 'less than or equal' },
	{ value: 'in', label: 'in' },
	{ value: 'between', label: 'between' },
];

@Component({
	selector: 'app-filter-default',
	templateUrl: './default-filter.component.html',
	styleUrls: ['./default-filter.component.css'],
	imports: [
		CommonModule,
		FormsModule,
		MatFormFieldModule,
		MatInputModule,
		MatSelectModule,
		DynamicModule,
		SignalComponentIoModule,
	],
})
export class DefaultFilterComponent extends BaseFilterFieldComponent implements OnInit, AfterViewInit {
	@Input() value: any;
	@Input() comparator: string = 'eq';
	@Input() valueComponent: Type<any>;

	public inValueText: string = '';
	public betweenLower: any;
	public betweenUpper: any;

	ngOnInit(): void {
		if (this.comparator === 'in' && Array.isArray(this.value)) {
			this.inValueText = this.value.join(', ');
		} else if (this.comparator === 'between' && Array.isArray(this.value)) {
			this.betweenLower = this.value[0];
			this.betweenUpper = this.value[1];
		}
	}

	ngAfterViewInit(): void {
		this.onComparatorChange.emit(this.comparator);
	}

	get comparatorOptions() {
		const innerType = (this.valueComponent as { type?: string })?.type;
		return innerType === 'text' ? TEXT_COMPARATORS : NUMBER_COMPARATORS;
	}

	get innerInputs(): Record<string, any> {
		return {
			key: this.key(),
			label: this.label(),
			value: this.value,
			readonly: this.comparator === 'empty',
			structure: this.structure(),
			relations: this.relations(),
			autofocus: this.autofocus(),
		};
	}

	get lowerInputs(): Record<string, any> {
		return {
			key: `${this.key()}-lower`,
			label: `${this.label()} (from)`,
			value: this.betweenLower,
			structure: this.structure(),
			relations: this.relations(),
			autofocus: this.autofocus(),
		};
	}

	get upperInputs(): Record<string, any> {
		return {
			key: `${this.key()}-upper`,
			label: `${this.label()} (to)`,
			value: this.betweenUpper,
			structure: this.structure(),
			relations: this.relations(),
		};
	}

	onComparatorSelect(comparator: string): void {
		const previous = this.comparator;
		this.comparator = comparator;

		if (comparator === 'empty') {
			this.value = '';
			this.onFieldChange.emit('');
		} else if (comparator === 'in' || comparator === 'between') {
			if (previous !== comparator) {
				this.value = undefined;
				this.inValueText = '';
				this.betweenLower = undefined;
				this.betweenUpper = undefined;
				this.onFieldChange.emit(undefined);
			}
		}

		this.onComparatorChange.emit(comparator);
	}

	onValueChange = (val: any): void => {
		this.value = val;
		this.onFieldChange.emit(val);
	};

	onInTextChange(text: string): void {
		this.inValueText = text;
		const parts = text
			.split(',')
			.map((v) => v.trim())
			.filter((v) => v.length > 0);

		if (parts.length === 0) {
			this.value = undefined;
			this.onFieldChange.emit(undefined);
			return;
		}

		this.value = parts;
		this.onFieldChange.emit(parts);
	}

	onBetweenLowerChange = (val: any): void => {
		this.betweenLower = val;
		this.value = [this.betweenLower, this.betweenUpper];
		this.onFieldChange.emit(this.value);
	};

	onBetweenUpperChange = (val: any): void => {
		this.betweenUpper = val;
		this.value = [this.betweenLower, this.betweenUpper];
		this.onFieldChange.emit(this.value);
	};
}
