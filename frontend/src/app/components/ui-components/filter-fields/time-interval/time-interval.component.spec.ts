import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TimeIntervalFilterComponent } from './time-interval.component';

describe('TimeIntervalFilterComponent', () => {
	let component: TimeIntervalFilterComponent;
	let fixture: ComponentFixture<TimeIntervalFilterComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [TimeIntervalFilterComponent, BrowserAnimationsModule],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(TimeIntervalFilterComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
