import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TimeEditComponent } from './time.component';

describe('TimeEditComponent', () => {
	let component: TimeEditComponent;
	let fixture: ComponentFixture<TimeEditComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [TimeEditComponent, BrowserAnimationsModule],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(TimeEditComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
