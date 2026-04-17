import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BinaryEditComponent } from './binary.component';

describe('BinaryEditComponent', () => {
	let component: BinaryEditComponent;
	let fixture: ComponentFixture<BinaryEditComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [FormsModule, BinaryEditComponent, BrowserAnimationsModule],
		}).compileComponents();

		fixture = TestBed.createComponent(BinaryEditComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		fixture.detectChanges();
		expect(component).toBeTruthy();
	});

	it('converts an incoming hex string to Buffer-JSON on init', () => {
		vi.spyOn(component.onFieldChange, 'emit');
		fixture.componentRef.setInput('value', '48656c6c6f');
		component.ngOnInit();
		expect(component.hexData).toBe('48656c6c6f');
		expect(component.onFieldChange.emit).toHaveBeenCalledWith({
			type: 'Buffer',
			data: [0x48, 0x65, 0x6c, 0x6c, 0x6f],
		});
	});

	it('re-emits an incoming Buffer-JSON value unchanged on init', () => {
		vi.spyOn(component.onFieldChange, 'emit');
		fixture.componentRef.setInput('value', { type: 'Buffer', data: [0x48, 0x65, 0x6c] });
		component.ngOnInit();
		expect(component.hexData).toBe('48656c');
		expect(component.onFieldChange.emit).toHaveBeenCalledWith({
			type: 'Buffer',
			data: [0x48, 0x65, 0x6c],
		});
	});

	it('emits null and shows empty hex when incoming value is null', () => {
		vi.spyOn(component.onFieldChange, 'emit');
		fixture.componentRef.setInput('value', null);
		component.ngOnInit();
		expect(component.hexData).toBe('');
		expect(component.onFieldChange.emit).toHaveBeenCalledWith(null);
	});

	it('emits Buffer-JSON on valid hex change', () => {
		vi.spyOn(component.onFieldChange, 'emit');
		component.hexData = '48656c6c6f';
		component.onHexChange();
		expect(component.onFieldChange.emit).toHaveBeenCalledWith({
			type: 'Buffer',
			data: [0x48, 0x65, 0x6c, 0x6c, 0x6f],
		});
		expect(component.isInvalidInput).toBe(false);
	});

	it('emits null when the field is cleared', () => {
		vi.spyOn(component.onFieldChange, 'emit');
		component.hexData = '';
		component.onHexChange();
		expect(component.onFieldChange.emit).toHaveBeenCalledWith(null);
	});

	it('marks invalid and emits raw string when hex is malformed', () => {
		vi.spyOn(component.onFieldChange, 'emit');
		component.hexData = 'zz';
		component.onHexChange();
		expect(component.isInvalidInput).toBe(true);
		expect(component.onFieldChange.emit).toHaveBeenCalledWith('zz');
	});
});
