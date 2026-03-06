import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { PointFilterComponent } from './point.component';

describe('PointFilterComponent', () => {
	let component: PointFilterComponent;
	let fixture: ComponentFixture<PointFilterComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [PointFilterComponent, BrowserAnimationsModule],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(PointFilterComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
