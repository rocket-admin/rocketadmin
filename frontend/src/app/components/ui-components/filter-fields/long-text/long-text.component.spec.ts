import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { LongTextFilterComponent } from './long-text.component';

describe('LongTextFilterComponent', () => {
	let component: LongTextFilterComponent;
	let fixture: ComponentFixture<LongTextFilterComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [LongTextFilterComponent, BrowserAnimationsModule],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(LongTextFilterComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
