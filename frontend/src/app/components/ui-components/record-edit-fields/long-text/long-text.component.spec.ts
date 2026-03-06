import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { LongTextEditComponent } from './long-text.component';

describe('LongTextEditComponent', () => {
	let component: LongTextEditComponent;
	let fixture: ComponentFixture<LongTextEditComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [LongTextEditComponent, BrowserAnimationsModule],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(LongTextEditComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
