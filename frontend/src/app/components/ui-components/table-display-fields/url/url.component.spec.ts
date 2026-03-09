import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { UrlDisplayComponent } from './url.component';

describe('UrlDisplayComponent', () => {
	let component: UrlDisplayComponent;
	let fixture: ComponentFixture<UrlDisplayComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [UrlDisplayComponent],
		})
			.overrideComponent(UrlDisplayComponent, {
				add: { imports: [CommonModule] },
			})
			.compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(UrlDisplayComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should return valid URL', () => {
		fixture.componentRef.setInput('value', 'https://example.com');
		expect(component.isValidUrl).toBe(true);
		expect(component.hrefValue).toBe('https://example.com');
	});

	it('should prepend prefix from widget params', () => {
		fixture.componentRef.setInput('value', 'example.com/path');
		fixture.componentRef.setInput('widgetStructure', {
			widget_params: { prefix: 'https://' },
		});
		expect(component.hrefValue).toBe('https://example.com/path');
		expect(component.isValidUrl).toBe(true);
	});

	it('should detect invalid URL', () => {
		fixture.componentRef.setInput('value', 'not a valid url');
		expect(component.isValidUrl).toBe(false);
	});
});
