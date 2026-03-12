import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TextDisplayComponent } from './text.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('TextDisplayComponent', () => {
	let component: TextDisplayComponent;
	let fixture: ComponentFixture<TextDisplayComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [TextDisplayComponent, BrowserAnimationsModule],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(TextDisplayComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should display value', () => {
		fixture.componentRef.setInput('value', 'Sample text');
		fixture.detectChanges();
		expect(component.value()).toBe('Sample text');
	});

	it('should detect invalid email when email validation configured', () => {
		fixture.componentRef.setInput('value', 'not-an-email');
		fixture.componentRef.setInput('widgetStructure', {
			widget_params: { validate: 'isEmail' },
		});
		fixture.detectChanges();
		expect(component.isInvalid).toBe(true);
	});

	it('should report valid for correct email', () => {
		fixture.componentRef.setInput('value', 'user@example.com');
		fixture.componentRef.setInput('widgetStructure', {
			widget_params: { validate: 'isEmail' },
		});
		fixture.detectChanges();
		expect(component.isInvalid).toBe(false);
	});
});
