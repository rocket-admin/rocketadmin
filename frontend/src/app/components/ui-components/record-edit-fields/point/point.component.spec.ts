import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { PointEditComponent } from './point.component';

describe('PointEditComponent', () => {
	let component: PointEditComponent;
	let fixture: ComponentFixture<PointEditComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [PointEditComponent, BrowserAnimationsModule],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(PointEditComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
