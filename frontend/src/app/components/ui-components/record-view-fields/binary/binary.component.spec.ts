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
		expect(component.displayText()).toBe('\u2014');
	});

	it('parses a server string as char-code-per-byte', () => {
		fixture.componentRef.setInput('value', 'Hel');
		fixture.detectChanges();
		expect(component.bytes()).toEqual([0x48, 0x65, 0x6c]);
		expect(component.hexValue()).toBe('48656c');
	});

	it('parses a Buffer-JSON value to a byte array', () => {
		fixture.componentRef.setInput('value', { type: 'Buffer', data: [0x48, 0x65, 0x6c] });
		fixture.detectChanges();
		expect(component.bytes()).toEqual([0x48, 0x65, 0x6c]);
		expect(component.hexValue()).toBe('48656c');
	});

	it('truncates long hex with ellipsis', () => {
		// 40 bytes of 0xaa → 80 hex chars, just at the limit; bump to 50 bytes to trigger truncation.
		fixture.componentRef.setInput('value', '\u00aa'.repeat(50));
		fixture.detectChanges();
		expect(component.hexValue()).toBe('aa'.repeat(50));
		expect(component.isTruncated()).toBe(true);
		expect(component.displayText()).toBe('aa'.repeat(40) + '\u2026');
	});
});
