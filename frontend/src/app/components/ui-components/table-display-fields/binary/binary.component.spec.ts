import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BinaryDisplayComponent } from './binary.component';

describe('BinaryDisplayComponent', () => {
	let component: BinaryDisplayComponent;
	let fixture: ComponentFixture<BinaryDisplayComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [BinaryDisplayComponent, BrowserAnimationsModule],
		}).compileComponents();

		fixture = TestBed.createComponent(BinaryDisplayComponent);
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

	it('truncates long hex at 20 chars', () => {
		fixture.componentRef.setInput('value', '\u00aa'.repeat(30));
		fixture.detectChanges();
		expect(component.displayText()).toBe('aa'.repeat(10) + '\u2026');
	});
});
