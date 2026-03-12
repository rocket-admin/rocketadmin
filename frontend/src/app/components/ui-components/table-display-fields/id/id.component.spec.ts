import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IdDisplayComponent } from './id.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('IdDisplayComponent', () => {
	let component: IdDisplayComponent;
	let fixture: ComponentFixture<IdDisplayComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [IdDisplayComponent, BrowserAnimationsModule],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(IdDisplayComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should display value', () => {
		fixture.componentRef.setInput('value', 42);
		fixture.detectChanges();
		expect(component.value()).toBe(42);
	});

	it('should display dash for null value', () => {
		fixture.componentRef.setInput('value', null);
		fixture.detectChanges();
		const compiled = fixture.nativeElement as HTMLElement;
		expect(compiled.querySelector('.field-value-id')?.textContent?.trim()).toBe('—');
	});
});
