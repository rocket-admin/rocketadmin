import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TimeFilterComponent } from './time.component';

describe('TimeFilterComponent', () => {
	let component: TimeFilterComponent;
	let fixture: ComponentFixture<TimeFilterComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [TimeFilterComponent, BrowserAnimationsModule],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(TimeFilterComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
