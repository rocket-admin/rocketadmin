import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TimeIntervalEditComponent } from './time-interval.component';

describe('TimeIntervalEditComponent', () => {
	let component: TimeIntervalEditComponent;
	let fixture: ComponentFixture<TimeIntervalEditComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [TimeIntervalEditComponent, BrowserAnimationsModule],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(TimeIntervalEditComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
