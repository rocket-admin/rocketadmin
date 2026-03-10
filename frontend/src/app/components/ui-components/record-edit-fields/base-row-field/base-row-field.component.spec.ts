import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BaseEditFieldComponent } from './base-row-field.component';

describe('BaseEditFieldComponent', () => {
	let component: BaseEditFieldComponent;
	let fixture: ComponentFixture<BaseEditFieldComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [BaseEditFieldComponent],
		}).compileComponents();

		fixture = TestBed.createComponent(BaseEditFieldComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should normalize label on init', () => {
		fixture.componentRef.setInput('label', 'user_first_name');
		component.ngOnInit();
		expect(component.normalizedLabel()).toBeTruthy();
	});

	it('should set normalizedLabel from label input', () => {
		fixture.componentRef.setInput('label', 'test_field');
		component.ngOnInit();
		expect(component.normalizedLabel()).toBeDefined();
		expect(typeof component.normalizedLabel()).toBe('string');
	});

	it('should have onFieldChange event emitter', () => {
		expect(component.onFieldChange).toBeDefined();
	});
});
