import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { vi } from 'vitest';
import { DateFilterComponent } from '../date/date.component';
import { NumberFilterComponent } from '../number/number.component';
import { TextFilterComponent } from '../text/text.component';
import { DefaultFilterComponent } from './default-filter.component';

describe('DefaultFilterComponent', () => {
	let component: DefaultFilterComponent;
	let fixture: ComponentFixture<DefaultFilterComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [DefaultFilterComponent, BrowserAnimationsModule],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(DefaultFilterComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		fixture.detectChanges();
		expect(component).toBeTruthy();
	});

	it('should expose text comparator options when wrapping a text-type filter', () => {
		component.valueComponent = TextFilterComponent;
		expect(component.comparatorOptions.map((o) => o.value)).toEqual([
			'startswith',
			'endswith',
			'eq',
			'contains',
			'icontains',
			'empty',
		]);
	});

	it('should expose number comparator options when wrapping a number-type filter', () => {
		component.valueComponent = NumberFilterComponent;
		expect(component.comparatorOptions.map((o) => o.value)).toEqual(['eq', 'gt', 'lt', 'gte', 'lte', 'in', 'between']);
	});

	it('should expose in/between for datetime inner components', () => {
		component.valueComponent = DateFilterComponent;
		const values = component.comparatorOptions.map((o) => o.value);
		expect(values).toContain('in');
		expect(values).toContain('between');
	});

	it('should emit initial comparator on view init', () => {
		const spy = vi.spyOn(component.onComparatorChange, 'emit');
		component.comparator = 'contains';
		component.ngAfterViewInit();
		expect(spy).toHaveBeenCalledWith('contains');
	});

	it('should emit value and reset it when "empty" comparator is selected', () => {
		const valueSpy = vi.spyOn(component.onFieldChange, 'emit');
		const cmpSpy = vi.spyOn(component.onComparatorChange, 'emit');
		component.value = 'foo';
		component.onComparatorSelect('empty');
		expect(component.value).toBe('');
		expect(valueSpy).toHaveBeenCalledWith('');
		expect(cmpSpy).toHaveBeenCalledWith('empty');
	});

	it('should emit comparator without resetting value for non-empty selections', () => {
		const valueSpy = vi.spyOn(component.onFieldChange, 'emit');
		const cmpSpy = vi.spyOn(component.onComparatorChange, 'emit');
		component.value = 'foo';
		component.onComparatorSelect('contains');
		expect(component.value).toBe('foo');
		expect(valueSpy).not.toHaveBeenCalled();
		expect(cmpSpy).toHaveBeenCalledWith('contains');
	});

	it('should re-emit value changes from inner widget via onValueChange', () => {
		const spy = vi.spyOn(component.onFieldChange, 'emit');
		component.onValueChange('bar');
		expect(component.value).toBe('bar');
		expect(spy).toHaveBeenCalledWith('bar');
	});

	it('should mark inner inputs as readonly when comparator is "empty"', () => {
		component.comparator = 'empty';
		expect(component.innerInputs.readonly).toBe(true);
	});

	it('should parse comma-separated text into an array on IN text change', () => {
		const valueSpy = vi.spyOn(component.onFieldChange, 'emit');
		component.valueComponent = NumberFilterComponent;
		component.comparator = 'in';
		component.onInTextChange('1, 2,3 , 4');

		expect(component.inValueText).toBe('1, 2,3 , 4');
		expect(valueSpy).toHaveBeenCalledWith(['1', '2', '3', '4']);
	});

	it('should emit undefined when IN text is empty', () => {
		const valueSpy = vi.spyOn(component.onFieldChange, 'emit');
		component.valueComponent = NumberFilterComponent;
		component.comparator = 'in';
		component.onInTextChange('   ');

		expect(valueSpy).toHaveBeenCalledWith(undefined);
	});

	it('should restore inValueText from an array value on init when comparator is in', () => {
		component.valueComponent = NumberFilterComponent;
		component.comparator = 'in';
		component.value = ['1', '2', '3'];
		component.ngOnInit();

		expect(component.inValueText).toBe('1, 2, 3');
	});

	it('should emit two-element array when BETWEEN bounds change', () => {
		const valueSpy = vi.spyOn(component.onFieldChange, 'emit');
		component.valueComponent = NumberFilterComponent;
		component.comparator = 'between';

		component.onBetweenLowerChange('10');
		expect(valueSpy).toHaveBeenLastCalledWith(['10', undefined]);

		component.onBetweenUpperChange('20');
		expect(valueSpy).toHaveBeenLastCalledWith(['10', '20']);
	});

	it('should restore BETWEEN bounds from a two-element array on init', () => {
		component.valueComponent = NumberFilterComponent;
		component.comparator = 'between';
		component.value = ['5', '15'];
		component.ngOnInit();

		expect(component.betweenLower).toBe('5');
		expect(component.betweenUpper).toBe('15');
	});

	it('should clear single-value state when switching to IN', () => {
		component.valueComponent = NumberFilterComponent;
		component.value = '42';
		const valueSpy = vi.spyOn(component.onFieldChange, 'emit');

		component.onComparatorSelect('in');

		expect(component.comparator).toBe('in');
		expect(valueSpy).toHaveBeenCalledWith(undefined);
	});

	it('should clear single-value state when switching to BETWEEN', () => {
		component.valueComponent = NumberFilterComponent;
		component.value = '42';
		const valueSpy = vi.spyOn(component.onFieldChange, 'emit');

		component.onComparatorSelect('between');

		expect(component.comparator).toBe('between');
		expect(valueSpy).toHaveBeenCalledWith(undefined);
	});
});
