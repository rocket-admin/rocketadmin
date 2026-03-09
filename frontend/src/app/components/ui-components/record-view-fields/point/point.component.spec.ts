import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PointRecordViewComponent } from './point.component';

describe('PointRecordViewComponent', () => {
	let component: PointRecordViewComponent;
	let fixture: ComponentFixture<PointRecordViewComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [PointRecordViewComponent],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(PointRecordViewComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should format string point', () => {
		component.value = '(1,2)';
		component.ngOnInit();
		expect(component.formattedPoint).toBe('(1, 2)');
	});

	it('should format object point', () => {
		component.value = { x: 3, y: 4 };
		component.ngOnInit();
		expect(component.formattedPoint).toBe('(3, 4)');
	});

	it('should handle null value', () => {
		component.value = null;
		component.ngOnInit();
		expect(component.formattedPoint).toBe('');
	});
});
