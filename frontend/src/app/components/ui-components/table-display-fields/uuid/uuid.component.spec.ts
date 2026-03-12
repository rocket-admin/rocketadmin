import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UuidDisplayComponent } from './uuid.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('UuidDisplayComponent', () => {
	let component: UuidDisplayComponent;
	let fixture: ComponentFixture<UuidDisplayComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [UuidDisplayComponent, BrowserAnimationsModule],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(UuidDisplayComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should display UUID value', () => {
		fixture.componentRef.setInput('value', '550e8400-e29b-41d4-a716-446655440000');
		fixture.detectChanges();
		const compiled = fixture.nativeElement as HTMLElement;
		expect(compiled.querySelector('.uuid-text')?.textContent?.trim()).toBe('550e8400-e29b-41d4-a716-446655440000');
	});

	it('should show NULL for empty value', () => {
		fixture.componentRef.setInput('value', null);
		fixture.detectChanges();
		const compiled = fixture.nativeElement as HTMLElement;
		expect(compiled.querySelector('.null-value')?.textContent?.trim()).toBe('NULL');
	});
});
