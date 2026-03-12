import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { PointDisplayComponent } from './point.component';

describe('PointDisplayComponent', () => {
	let component: PointDisplayComponent;
	let fixture: ComponentFixture<PointDisplayComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [PointDisplayComponent],
		})
			.overrideComponent(PointDisplayComponent, {
				add: { imports: [CommonModule] },
			})
			.compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(PointDisplayComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should format point string', () => {
		fixture.componentRef.setInput('value', '(3.5, 7.2)');
		component.ngOnInit();
		expect(component.formattedPoint).toBe('(3.5, 7.2)');
	});

	it('should format point object', () => {
		fixture.componentRef.setInput('value', { x: 10, y: 20 });
		component.ngOnInit();
		expect(component.formattedPoint).toBe('(10, 20)');
	});

	it('should display dash for null', () => {
		fixture.componentRef.setInput('value', null);
		component.ngOnInit();
		expect(component.formattedPoint).toBe('');
	});
});
