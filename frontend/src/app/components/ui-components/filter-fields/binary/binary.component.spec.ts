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

	it('defaults to eq filter mode with empty hex', () => {
		fixture.detectChanges();
		expect(component.filterMode).toBe('eq');
		expect(component.hexValue).toBe('');
	});

	it('normalizes the incoming hex value through bytes on init', () => {
		component.value = '48656c6c6f';
		component.ngOnInit();
		expect(component.hexValue).toBe('48656c6c6f');
	});

	it('drops a malformed incoming hex value to empty on init', () => {
		component.value = 'zz';
		component.ngOnInit();
		expect(component.hexValue).toBe('');
	});

	it('emits the hex string and current comparator on hex change', () => {
		vi.spyOn(component.onFieldChange, 'emit');
		vi.spyOn(component.onComparatorChange, 'emit');
		fixture.detectChanges();

		component.onHexValueChange('abcdef');

		expect(component.onFieldChange.emit).toHaveBeenCalledWith('abcdef');
		expect(component.onComparatorChange.emit).toHaveBeenCalledWith('eq');
	});

	it('switches to empty mode and clears hex', () => {
		vi.spyOn(component.onFieldChange, 'emit');
		vi.spyOn(component.onComparatorChange, 'emit');
		fixture.detectChanges();

		component.hexValue = 'abcdef';
		component.onFilterModeChange('empty');

		expect(component.hexValue).toBe('');
		expect(component.onComparatorChange.emit).toHaveBeenCalledWith('empty');
		expect(component.onFieldChange.emit).toHaveBeenCalledWith('');
	});

	it('emits contains comparator and re-emits current hex', () => {
		vi.spyOn(component.onFieldChange, 'emit');
		vi.spyOn(component.onComparatorChange, 'emit');
		fixture.detectChanges();

		component.hexValue = 'abcdef';
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
});
