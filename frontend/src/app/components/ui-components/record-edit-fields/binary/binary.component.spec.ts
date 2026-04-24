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

	it('parses a server string as char-code-per-byte on init and does not emit', () => {
		vi.spyOn(component.onFieldChange, 'emit');
		fixture.componentRef.setInput('value', 'Hello');
		component.ngOnInit();
		// 'Hello' -> bytes 48 65 6c 6c 6f -> hex '48656c6c6f'
		expect(component.hexData).toBe('48656c6c6f');
		expect(component.onFieldChange.emit).not.toHaveBeenCalled();
	});

	it('parses an incoming Buffer-JSON value into hex on init without emitting', () => {
		vi.spyOn(component.onFieldChange, 'emit');
		fixture.componentRef.setInput('value', { type: 'Buffer', data: [0x48, 0x65, 0x6c] });
		component.ngOnInit();
		expect(component.hexData).toBe('48656c');
		expect(component.onFieldChange.emit).not.toHaveBeenCalled();
	});

	it('shows empty hex when incoming value is null and does not emit on init', () => {
		vi.spyOn(component.onFieldChange, 'emit');
		fixture.componentRef.setInput('value', null);
		component.ngOnInit();
		expect(component.hexData).toBe('');
		expect(component.onFieldChange.emit).not.toHaveBeenCalled();
	});

	it('emits Buffer-JSON when the user types valid hex', () => {
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

	it('marks invalid and emits raw string when the user types malformed hex', () => {
		vi.spyOn(component.onFieldChange, 'emit');
		component.hexData = 'zz';
		component.onHexChange();
		expect(component.isInvalidInput).toBe(true);
		expect(component.onFieldChange.emit).toHaveBeenCalledWith('zz');
	});
});
