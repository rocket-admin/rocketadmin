import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BinaryRecordViewComponent } from './binary.component';

describe('BinaryRecordViewComponent', () => {
	let component: BinaryRecordViewComponent;
	let fixture: ComponentFixture<BinaryRecordViewComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [BinaryRecordViewComponent, BrowserAnimationsModule],
		}).compileComponents();

		fixture = TestBed.createComponent(BinaryRecordViewComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		fixture.detectChanges();
		expect(component).toBeTruthy();
	});

	it('shows em-dash for empty value', () => {
		fixture.detectChanges();
		expect(component.displayText()).toBe('—');
	});

	it('parses a server string as char-code-per-byte', () => {
		fixture.componentRef.setInput('value', 'Hel');
		fixture.detectChanges();
		expect(component.bytes()).toEqual([0x48, 0x65, 0x6c]);
		expect(component.encodedValue()).toBe('48656c');
	});

	it('parses a Buffer-JSON value to a byte array', () => {
		fixture.componentRef.setInput('value', { type: 'Buffer', data: [0x48, 0x65, 0x6c] });
		fixture.detectChanges();
		expect(component.bytes()).toEqual([0x48, 0x65, 0x6c]);
		expect(component.encodedValue()).toBe('48656c');
	});

	it('truncates long hex with ellipsis', () => {
		fixture.componentRef.setInput('value', 'ª'.repeat(50));
		fixture.detectChanges();
		expect(component.encodedValue()).toBe('aa'.repeat(50));
		expect(component.isTruncated()).toBe(true);
		expect(component.displayText()).toBe('aa'.repeat(40) + '…');
	});

	describe('encoding param', () => {
		it('defaults to hex when widgetStructure is absent', () => {
			fixture.componentRef.setInput('value', 'Hi');
			fixture.detectChanges();
			expect(component.encoding()).toBe('hex');
			expect(component.encodedValue()).toBe('4869');
		});

		it('renders base64 when encoding=base64', () => {
			fixture.componentRef.setInput('value', 'Hello');
			fixture.componentRef.setInput('widgetStructure', { widget_params: { encoding: 'base64' } });
			fixture.detectChanges();
			expect(component.encoding()).toBe('base64');
			expect(component.encodedValue()).toBe('SGVsbG8=');
		});

		it('renders ascii with non-printable replacement', () => {
			fixture.componentRef.setInput('value', { type: 'Buffer', data: [0x48, 0x00, 0x69] });
			fixture.componentRef.setInput('widgetStructure', { widget_params: { encoding: 'ascii' } });
			fixture.detectChanges();
			expect(component.encoding()).toBe('ascii');
			expect(component.encodedValue()).toBe('H.i');
		});
	});
});
