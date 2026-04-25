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
		expect(component.rawInput).toBe('48656c6c6f');
		expect(component.onFieldChange.emit).not.toHaveBeenCalled();
	});

	it('parses an incoming Buffer-JSON value into hex on init without emitting', () => {
		vi.spyOn(component.onFieldChange, 'emit');
		fixture.componentRef.setInput('value', { type: 'Buffer', data: [0x48, 0x65, 0x6c] });
		component.ngOnInit();
		expect(component.rawInput).toBe('48656c');
		expect(component.onFieldChange.emit).not.toHaveBeenCalled();
	});

	it('shows empty hex when incoming value is null and does not emit on init', () => {
		vi.spyOn(component.onFieldChange, 'emit');
		fixture.componentRef.setInput('value', null);
		component.ngOnInit();
		expect(component.rawInput).toBe('');
		expect(component.onFieldChange.emit).not.toHaveBeenCalled();
	});

	it('emits Buffer-JSON when the user types valid hex', () => {
		vi.spyOn(component.onFieldChange, 'emit');
		component.rawInput = '48656c6c6f';
		component.onInputChange();
		expect(component.onFieldChange.emit).toHaveBeenCalledWith({
			type: 'Buffer',
			data: [0x48, 0x65, 0x6c, 0x6c, 0x6f],
		});
		expect(component.isInvalidInput).toBe(false);
	});

	it('emits null when the field is cleared', () => {
		vi.spyOn(component.onFieldChange, 'emit');
		component.rawInput = '';
		component.onInputChange();
		expect(component.onFieldChange.emit).toHaveBeenCalledWith(null);
	});

	it('marks invalid and emits raw string when the user types malformed hex', () => {
		vi.spyOn(component.onFieldChange, 'emit');
		component.rawInput = 'zz';
		component.onInputChange();
		expect(component.isInvalidInput).toBe(true);
		expect(component.onFieldChange.emit).toHaveBeenCalledWith('zz');
	});

	describe('encoding param', () => {
		it('seeds the input as base64 when encoding=base64', () => {
			fixture.componentRef.setInput('widgetStructure', { widget_params: { encoding: 'base64' } });
			fixture.componentRef.setInput('value', { type: 'Buffer', data: [0x48, 0x65, 0x6c, 0x6c, 0x6f] });
			component.ngOnInit();
			expect(component.encoding()).toBe('base64');
			expect(component.rawInput).toBe('SGVsbG8=');
		});

		it('emits Buffer-JSON for valid base64', () => {
			fixture.componentRef.setInput('widgetStructure', { widget_params: { encoding: 'base64' } });
			vi.spyOn(component.onFieldChange, 'emit');
			component.rawInput = 'SGVsbG8=';
			component.onInputChange();
			expect(component.isInvalidInput).toBe(false);
			expect(component.onFieldChange.emit).toHaveBeenCalledWith({
				type: 'Buffer',
				data: [0x48, 0x65, 0x6c, 0x6c, 0x6f],
			});
		});

		it('marks invalid and emits raw when base64 is malformed', () => {
			fixture.componentRef.setInput('widgetStructure', { widget_params: { encoding: 'base64' } });
			vi.spyOn(component.onFieldChange, 'emit');
			component.rawInput = '!!!bad!!!';
			component.onInputChange();
			expect(component.isInvalidInput).toBe(true);
			expect(component.onFieldChange.emit).toHaveBeenCalledWith('!!!bad!!!');
		});

		it('seeds the input as ascii with non-printable replacement when encoding=ascii', () => {
			fixture.componentRef.setInput('widgetStructure', { widget_params: { encoding: 'ascii' } });
			fixture.componentRef.setInput('value', { type: 'Buffer', data: [0x48, 0x00, 0x69] });
			component.ngOnInit();
			expect(component.encoding()).toBe('ascii');
			expect(component.rawInput).toBe('H.i');
		});

		it('always emits Buffer-JSON for ascii input, never invalid', () => {
			fixture.componentRef.setInput('widgetStructure', { widget_params: { encoding: 'ascii' } });
			vi.spyOn(component.onFieldChange, 'emit');
			component.rawInput = 'Hi';
			component.onInputChange();
			expect(component.isInvalidInput).toBe(false);
			expect(component.onFieldChange.emit).toHaveBeenCalledWith({
				type: 'Buffer',
				data: [0x48, 0x69],
			});
		});
	});
});
