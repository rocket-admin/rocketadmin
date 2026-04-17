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

	it('shows hex as-is when short', () => {
		fixture.componentRef.setInput('value', 'abcdef');
		fixture.detectChanges();
		expect(component.displayText()).toBe('abcdef');
	});

	it('truncates long hex at 20 chars', () => {
		const longHex = 'a'.repeat(30);
		fixture.componentRef.setInput('value', longHex);
		fixture.detectChanges();
		expect(component.displayText()).toBe('a'.repeat(20) + '\u2026');
	});

	it('converts Buffer-JSON to hex', () => {
		fixture.componentRef.setInput('value', { type: 'Buffer', data: [0x48, 0x65, 0x6c] });
		fixture.detectChanges();
		expect(component.hexValue()).toBe('48656c');
	});

	it('exposes the full hex via hexValue', () => {
		const longHex = 'a'.repeat(60);
		fixture.componentRef.setInput('value', longHex);
		fixture.detectChanges();
		expect(component.hexValue()).toBe(longHex);
	});
});
