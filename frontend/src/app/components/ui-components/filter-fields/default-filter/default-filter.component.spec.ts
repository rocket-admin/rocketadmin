import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { vi } from 'vitest';
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
		expect(component.comparatorOptions.map((o) => o.value)).toEqual(['eq', 'gt', 'lt', 'gte', 'lte']);
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
});
