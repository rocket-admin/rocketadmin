import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BooleanRecordViewComponent } from './boolean.component';

describe('BooleanRecordViewComponent', () => {
	let component: BooleanRecordViewComponent;
	let fixture: ComponentFixture<BooleanRecordViewComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [BooleanRecordViewComponent],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(BooleanRecordViewComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should return false for invertColors when no widget params', () => {
		fixture.componentRef.setInput('widgetStructure', undefined);
		expect(component.invertColors).toBe(false);
	});

	it('should return true for invertColors when widget_params.invertColors is true', () => {
		fixture.componentRef.setInput('widgetStructure', { widget_params: { invertColors: true } } as any);
		expect(component.invertColors).toBe(true);
	});
});
