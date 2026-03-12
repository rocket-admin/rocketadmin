import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImageDisplayComponent } from './image.component';

describe('ImageDisplayComponent', () => {
	let component: ImageDisplayComponent;
	let fixture: ComponentFixture<ImageDisplayComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [ImageDisplayComponent],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(ImageDisplayComponent);
		component = fixture.componentInstance;
		fixture.componentRef.setInput('widgetStructure', { widget_params: { height: 50 } });
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should detect valid URL', () => {
		fixture.componentRef.setInput('value', 'https://example.com/image.png');
		fixture.detectChanges();

		expect(component.isUrl).toBe(true);
	});

	it('should detect invalid URL', () => {
		fixture.componentRef.setInput('value', 'not-a-url');
		fixture.detectChanges();

		expect(component.isUrl).toBe(false);
	});
});
