import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImageRecordViewComponent } from './image.component';

describe('ImageRecordViewComponent', () => {
	let component: ImageRecordViewComponent;
	let fixture: ComponentFixture<ImageRecordViewComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [ImageRecordViewComponent],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(ImageRecordViewComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should return value as srcValue when no prefix', () => {
		component.value = 'image.png';
		component.widgetStructure = undefined;
		expect(component.srcValue).toBe('image.png');
	});

	it('should prepend prefix to srcValue from widget params', () => {
		component.value = 'image.png';
		component.widgetStructure = { widget_params: { prefix: 'https://cdn.example.com/' } } as any;
		expect(component.srcValue).toBe('https://cdn.example.com/image.png');
	});

	it('should return true for isUrl when valid URL', () => {
		component.value = 'image.png';
		component.widgetStructure = { widget_params: { prefix: 'https://cdn.example.com/' } } as any;
		expect(component.isUrl).toBe(true);
	});

	it('should return false for isUrl when invalid URL', () => {
		component.value = 'image.png';
		component.widgetStructure = undefined;
		expect(component.isUrl).toBe(false);
	});
});
