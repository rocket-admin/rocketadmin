import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LongTextDisplayComponent } from './long-text.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('LongTextDisplayComponent', () => {
	let component: LongTextDisplayComponent;
	let fixture: ComponentFixture<LongTextDisplayComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [LongTextDisplayComponent, BrowserAnimationsModule],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(LongTextDisplayComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should display value', () => {
		fixture.componentRef.setInput('value', 'This is a long text value for testing');
		fixture.detectChanges();
		expect(component.value()).toBe('This is a long text value for testing');
	});

	it('should display dash for null', () => {
		fixture.componentRef.setInput('value', null);
		fixture.detectChanges();
		expect(component.value()).toBeNull();
	});
});
