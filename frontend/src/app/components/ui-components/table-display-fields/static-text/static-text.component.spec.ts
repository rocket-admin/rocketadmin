import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StaticTextDisplayComponent } from './static-text.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('StaticTextDisplayComponent', () => {
	let component: StaticTextDisplayComponent;
	let fixture: ComponentFixture<StaticTextDisplayComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [StaticTextDisplayComponent, BrowserAnimationsModule],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(StaticTextDisplayComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should display value', () => {
		fixture.componentRef.setInput('value', 'Hello World');
		fixture.detectChanges();
		expect(component.value()).toBe('Hello World');
	});

	it('should display dash for null', () => {
		fixture.componentRef.setInput('value', null);
		fixture.detectChanges();
		expect(component.value()).toBeNull();
	});
});
