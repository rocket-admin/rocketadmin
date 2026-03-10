import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ImageEditComponent } from './image.component';

describe('ImageComponent', () => {
	let component: ImageEditComponent;
	let fixture: ComponentFixture<ImageEditComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [FormsModule, ImageEditComponent, BrowserAnimationsModule],
		}).compileComponents();

		fixture = TestBed.createComponent(ImageEditComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should have empty prefix by default', () => {
		expect(component.prefix).toBe('');
	});

	it('should parse prefix from widget params object', () => {
		fixture.componentRef.setInput('widgetStructure', { widget_params: { prefix: 'https://cdn.example.com/' } } as any);
		component.ngOnInit();
		expect(component.prefix).toBe('https://cdn.example.com/');
	});

	it('should parse prefix from widget params string', () => {
		fixture.componentRef.setInput('widgetStructure', { widget_params: JSON.stringify({ prefix: 'https://images.test/' }) } as any);
		component.ngOnInit();
		expect(component.prefix).toBe('https://images.test/');
	});

	it('should keep empty prefix when widget params have no prefix', () => {
		fixture.componentRef.setInput('widgetStructure', { widget_params: {} } as any);
		component.ngOnInit();
		expect(component.prefix).toBe('');
	});

	it('should update prefix on ngOnChanges', () => {
		fixture.componentRef.setInput('widgetStructure', { widget_params: { prefix: 'https://cdn.test/' } } as any);
		component.ngOnChanges();
		expect(component.prefix).toBe('https://cdn.test/');
	});

	it('should return empty string for imageUrl when value is empty', () => {
		fixture.componentRef.setInput('value', '');
		expect(component.imageUrl).toBe('');
	});

	it('should return value without prefix when prefix is empty', () => {
		fixture.componentRef.setInput('value', 'photo.jpg');
		expect(component.imageUrl).toBe('photo.jpg');
	});

	it('should return prefix + value for imageUrl', () => {
		component.prefix = 'https://cdn.example.com/';
		fixture.componentRef.setInput('value', 'photo.jpg');
		expect(component.imageUrl).toBe('https://cdn.example.com/photo.jpg');
	});

	it('should handle invalid JSON in widget params gracefully', () => {
		fixture.componentRef.setInput('widgetStructure', { widget_params: 'invalid-json' } as any);
		component.ngOnInit();
		expect(component.prefix).toBe('');
	});
});
