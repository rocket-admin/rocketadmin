import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BaseTableDisplayFieldComponent } from './base-table-display-field.component';

describe('BaseTableDisplayFieldComponent', () => {
	let component: BaseTableDisplayFieldComponent;
	let fixture: ComponentFixture<BaseTableDisplayFieldComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [BaseTableDisplayFieldComponent],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(BaseTableDisplayFieldComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should accept value input', () => {
		fixture.componentRef.setInput('value', 'test-value');
		fixture.detectChanges();
		expect(component.value()).toBe('test-value');
	});

	it('should accept key input', () => {
		fixture.componentRef.setInput('key', 'test-key');
		fixture.detectChanges();
		expect(component.key()).toBe('test-key');
	});
});
