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

	it('shows hex as-is when short', () => {
		fixture.componentRef.setInput('value', 'abcdef');
		fixture.detectChanges();
		expect(component.displayText()).toBe('abcdef');
		expect(component.isTruncated()).toBe(false);
	});

	it('truncates long hex with ellipsis', () => {
		const longHex = 'a'.repeat(120);
		fixture.componentRef.setInput('value', longHex);
		fixture.detectChanges();
		expect(component.displayText()).toBe('a'.repeat(80) + '\u2026');
		expect(component.isTruncated()).toBe(true);
	});

	it('converts Buffer-JSON to hex', () => {
		fixture.componentRef.setInput('value', { type: 'Buffer', data: [0x48, 0x65, 0x6c] });
		fixture.detectChanges();
		expect(component.hexValue()).toBe('48656c');
	});
});
