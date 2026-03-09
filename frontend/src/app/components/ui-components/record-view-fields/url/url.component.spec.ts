import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UrlRecordViewComponent } from './url.component';

describe('UrlRecordViewComponent', () => {
	let component: UrlRecordViewComponent;
	let fixture: ComponentFixture<UrlRecordViewComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [UrlRecordViewComponent],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(UrlRecordViewComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should return true for valid URL', () => {
		component.value = 'https://example.com';
		expect(component.isValidUrl).toBe(true);
	});

	it('should return false for invalid URL', () => {
		component.value = 'not-a-url';
		expect(component.isValidUrl).toBe(false);
	});

	it('should return false for empty value', () => {
		component.value = '';
		expect(component.isValidUrl).toBe(false);
	});
});
