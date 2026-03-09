import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { UrlEditComponent } from './url.component';

describe('UrlComponent', () => {
	let component: UrlEditComponent;
	let fixture: ComponentFixture<UrlEditComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [FormsModule, UrlEditComponent, BrowserAnimationsModule],
		}).compileComponents();

		fixture = TestBed.createComponent(UrlEditComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should have empty prefix by default', () => {
		expect(component.prefix).toBe('');
	});

	it('should parse prefix from widget params object', () => {
		component.widgetStructure = { widget_params: { prefix: 'https://api.example.com/' } } as any;
		component.ngOnInit();
		expect(component.prefix).toBe('https://api.example.com/');
	});

	it('should parse prefix from widget params string', () => {
		component.widgetStructure = { widget_params: JSON.stringify({ prefix: 'https://test.com/' }) } as any;
		component.ngOnInit();
		expect(component.prefix).toBe('https://test.com/');
	});

	it('should keep empty prefix when widget params have no prefix', () => {
		component.widgetStructure = { widget_params: {} } as any;
		component.ngOnInit();
		expect(component.prefix).toBe('');
	});

	it('should update prefix on ngOnChanges', () => {
		component.widgetStructure = { widget_params: { prefix: 'https://updated.com/' } } as any;
		component.ngOnChanges();
		expect(component.prefix).toBe('https://updated.com/');
	});

	it('should handle invalid JSON in widget params gracefully', () => {
		component.widgetStructure = { widget_params: 'invalid-json' } as any;
		component.ngOnInit();
		expect(component.prefix).toBe('');
	});

	it('should not change prefix when widgetStructure is undefined', () => {
		component.widgetStructure = undefined;
		component.ngOnInit();
		expect(component.prefix).toBe('');
	});
});
