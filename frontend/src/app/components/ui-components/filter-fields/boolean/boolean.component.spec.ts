import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BooleanFilterComponent } from './boolean.component';

describe('BooleanFilterComponent', () => {
	let component: BooleanFilterComponent;
	let fixture: ComponentFixture<BooleanFilterComponent>;

	const fakeStructureNotNull = {
		column_name: 'banned',
		column_default: '0',
		data_type: 'tinyint',
		isExcluded: false,
		isSearched: false,
		auto_increment: false,
		allow_null: false,
		character_maximum_length: 1,
	};

	const fakeStructureNullable = {
		...fakeStructureNotNull,
		allow_null: true,
	};

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [MatSnackBarModule, MatDialogModule, BooleanFilterComponent, BrowserAnimationsModule],
			providers: [provideHttpClient()],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(BooleanFilterComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should set booleanValue to false when input value is 0', () => {
		component.value = 0;
		fixture.componentRef.setInput('structure', fakeStructureNotNull);
		component.ngOnInit();

		expect(component.booleanValue).toEqual(false);
	});

	it('should set booleanValue to unknown when input value is null', () => {
		component.value = null;
		fixture.componentRef.setInput('structure', fakeStructureNullable);
		component.ngOnInit();

		expect(component.booleanValue).toEqual('unknown');
	});

	it('should set booleanValue to unknown when input value is empty string', () => {
		component.value = '';
		fixture.componentRef.setInput('structure', fakeStructureNullable);
		component.ngOnInit();

		expect(component.booleanValue).toEqual('unknown');
	});

	it('should set isRadiogroup to false if allow_null is false', () => {
		component.value = undefined;
		fixture.componentRef.setInput('structure', fakeStructureNotNull);
		component.ngOnInit();

		expect(component.isRadiogroup).toEqual(false);
	});

	it('should set isRadiogroup to true if allow_null is true', () => {
		component.value = undefined;
		fixture.componentRef.setInput('structure', fakeStructureNullable);
		component.ngOnInit();

		expect(component.isRadiogroup).toEqual(true);
	});

	it('should emit eq comparator when Yes is toggled', () => {
		vi.spyOn(component.onFieldChange, 'emit');
		vi.spyOn(component.onComparatorChange, 'emit');
		fixture.componentRef.setInput('structure', fakeStructureNullable);
		component.ngOnInit();

		component.booleanValue = true;
		component.onBooleanChange();

		expect(component.onFieldChange.emit).toHaveBeenCalled();
		expect(component.onComparatorChange.emit).toHaveBeenCalledWith('eq');
	});

	it('should emit eq comparator when No is toggled', () => {
		vi.spyOn(component.onFieldChange, 'emit');
		vi.spyOn(component.onComparatorChange, 'emit');
		fixture.componentRef.setInput('structure', fakeStructureNullable);
		component.ngOnInit();

		component.booleanValue = false;
		component.onBooleanChange();

		expect(component.onFieldChange.emit).toHaveBeenCalled();
		expect(component.onComparatorChange.emit).toHaveBeenCalledWith('eq');
	});

	it('should emit eq comparator and null value when Null is toggled', () => {
		vi.spyOn(component.onFieldChange, 'emit');
		vi.spyOn(component.onComparatorChange, 'emit');
		fixture.componentRef.setInput('structure', fakeStructureNullable);
		component.ngOnInit();

		component.booleanValue = 'unknown';
		component.onBooleanChange();

		expect(component.onFieldChange.emit).toHaveBeenCalledWith(null);
		expect(component.onComparatorChange.emit).toHaveBeenCalledWith('eq');
	});

	it('should render Null option when allow_null is true', () => {
		fixture.componentRef.setInput('structure', fakeStructureNullable);
		fixture.detectChanges();

		const buttons = fixture.nativeElement.querySelectorAll('mat-button-toggle');
		const labels = Array.from(buttons).map((b: Element) => b.textContent?.trim());

		expect(labels).toContain('Null');
	});

	it('should not render Null option when allow_null is false', () => {
		fixture.componentRef.setInput('structure', fakeStructureNotNull);
		fixture.detectChanges();

		const buttons = fixture.nativeElement.querySelectorAll('mat-button-toggle');
		const labels = Array.from(buttons).map((b: Element) => b.textContent?.trim());

		expect(labels).not.toContain('Null');
		expect(labels).toContain('Yes');
		expect(labels).toContain('No');
	});
});
