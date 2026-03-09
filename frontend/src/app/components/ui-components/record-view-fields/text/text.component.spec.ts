import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TextRecordViewComponent } from './text.component';

describe('TextRecordViewComponent', () => {
	let component: TextRecordViewComponent;
	let fixture: ComponentFixture<TextRecordViewComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [TextRecordViewComponent],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(TextRecordViewComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		fixture.detectChanges();
		expect(component).toBeTruthy();
	});

	it('should return false for isInvalid when value is empty', () => {
		component.value = '';
		expect(component.isInvalid).toBe(false);
	});

	it('should return false for isInvalid when no validate widget param', () => {
		component.value = 'sometext';
		component.widgetStructure = { widget_params: {} } as any;
		expect(component.isInvalid).toBe(false);
	});

	it('should return true for isInvalid when email validation fails', () => {
		component.value = 'notanemail';
		component.widgetStructure = { widget_params: { validate: 'isEmail' } } as any;
		expect(component.isInvalid).toBe(true);
	});

	it('should return false for isInvalid when email validation passes', () => {
		component.value = 'test@test.com';
		component.widgetStructure = { widget_params: { validate: 'isEmail' } } as any;
		expect(component.isInvalid).toBe(false);
	});

	it('should return correct validationErrorMessage for isEmail', () => {
		component.widgetStructure = { widget_params: { validate: 'isEmail' } } as any;
		expect(component.validationErrorMessage).toBe('Invalid email address');
	});

	it('should validate regex pattern', () => {
		component.value = 'abc';
		component.widgetStructure = { widget_params: { validate: 'regex', regex: '^[0-9]+$' } } as any;
		expect(component.isInvalid).toBe(true);
	});
});
