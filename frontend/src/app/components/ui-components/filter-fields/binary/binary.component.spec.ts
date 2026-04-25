import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BinaryFilterComponent } from './binary.component';

describe('BinaryFilterComponent', () => {
	let component: BinaryFilterComponent;
	let fixture: ComponentFixture<BinaryFilterComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [BinaryFilterComponent, BrowserAnimationsModule],
		}).compileComponents();

		fixture = TestBed.createComponent(BinaryFilterComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		fixture.detectChanges();
		expect(component).toBeTruthy();
	});

	it('defaults to eq filter mode with empty input', () => {
		fixture.detectChanges();
		expect(component.filterMode).toBe('eq');
		expect(component.rawInput).toBe('');
	});

	it('normalizes the incoming hex value through bytes on init', () => {
		component.value = '48656c6c6f';
		component.ngOnInit();
		expect(component.rawInput).toBe('48656c6c6f');
	});

	it('drops a malformed incoming hex value to empty on init', () => {
		component.value = 'zz';
		component.ngOnInit();
		expect(component.rawInput).toBe('');
	});

	it('emits the hex string and current comparator on input change', () => {
		vi.spyOn(component.onFieldChange, 'emit');
		vi.spyOn(component.onComparatorChange, 'emit');
		fixture.detectChanges();

		component.onInputChange('abcdef');

		expect(component.onFieldChange.emit).toHaveBeenCalledWith('abcdef');
		expect(component.onComparatorChange.emit).toHaveBeenCalledWith('eq');
	});

	it('switches to empty mode and clears input', () => {
		vi.spyOn(component.onFieldChange, 'emit');
		vi.spyOn(component.onComparatorChange, 'emit');
		fixture.detectChanges();

		component.rawInput = 'abcdef';
		component.onFilterModeChange('empty');

		expect(component.rawInput).toBe('');
		expect(component.onComparatorChange.emit).toHaveBeenCalledWith('empty');
		expect(component.onFieldChange.emit).toHaveBeenCalledWith('');
	});

	it('emits contains comparator and re-emits current hex', () => {
		vi.spyOn(component.onFieldChange, 'emit');
		vi.spyOn(component.onComparatorChange, 'emit');
		fixture.detectChanges();

		component.rawInput = 'abcdef';
		component.onFilterModeChange('contains');

		expect(component.onComparatorChange.emit).toHaveBeenCalledWith('contains');
		expect(component.onFieldChange.emit).toHaveBeenCalledWith('abcdef');
	});

	it('emits startswith comparator', () => {
		vi.spyOn(component.onComparatorChange, 'emit');
		fixture.detectChanges();

		component.onFilterModeChange('startswith');
		expect(component.onComparatorChange.emit).toHaveBeenCalledWith('startswith');
	});

	describe('encoding param', () => {
		it('seeds rawInput in the selected encoding from the incoming hex value', () => {
			fixture.componentRef.setInput('widgetStructure', { widget_params: { encoding: 'base64' } });
			component.value = '48656c6c6f';
			component.ngOnInit();
			expect(component.encoding()).toBe('base64');
			expect(component.rawInput).toBe('SGVsbG8=');
		});

		it('emits hex to backend when the user types base64', () => {
			fixture.componentRef.setInput('widgetStructure', { widget_params: { encoding: 'base64' } });
			vi.spyOn(component.onFieldChange, 'emit');
			fixture.detectChanges();

			component.onInputChange('SGVsbG8=');

			expect(component.onFieldChange.emit).toHaveBeenCalledWith('48656c6c6f');
			expect(component.isInvalidInput).toBe(false);
		});

		it('emits empty hex and marks invalid when base64 input is malformed', () => {
			fixture.componentRef.setInput('widgetStructure', { widget_params: { encoding: 'base64' } });
			vi.spyOn(component.onFieldChange, 'emit');
			fixture.detectChanges();

			component.onInputChange('!!!');

			expect(component.onFieldChange.emit).toHaveBeenCalledWith('');
			expect(component.isInvalidInput).toBe(true);
		});

		it('emits hex to backend when the user types ascii', () => {
			fixture.componentRef.setInput('widgetStructure', { widget_params: { encoding: 'ascii' } });
			vi.spyOn(component.onFieldChange, 'emit');
			fixture.detectChanges();

			component.onInputChange('Hi');

			expect(component.onFieldChange.emit).toHaveBeenCalledWith('4869');
		});
	});
});
