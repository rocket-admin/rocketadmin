import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, Input, OnInit, Type } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
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
];

@Component({
	selector: 'app-filter-default',
	templateUrl: './default-filter.component.html',
	styleUrls: ['./default-filter.component.css'],
	imports: [CommonModule, FormsModule, MatFormFieldModule, MatSelectModule, DynamicModule, SignalComponentIoModule],
})
export class DefaultFilterComponent extends BaseFilterFieldComponent implements OnInit, AfterViewInit {
	@Input() value: any;
	@Input() comparator: string = 'eq';
	@Input() valueComponent: Type<any>;

	ngOnInit(): void {}

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

	onComparatorSelect(comparator: string): void {
		this.comparator = comparator;
		if (comparator === 'empty') {
			this.value = '';
			this.onFieldChange.emit('');
		}
		this.onComparatorChange.emit(comparator);
	}

	onValueChange = (val: any): void => {
		this.value = val;
		this.onFieldChange.emit(val);
	};
}
