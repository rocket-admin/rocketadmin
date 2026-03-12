import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PasswordDisplayComponent } from './password.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('PasswordDisplayComponent', () => {
	let component: PasswordDisplayComponent;
	let fixture: ComponentFixture<PasswordDisplayComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [PasswordDisplayComponent, BrowserAnimationsModule],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(PasswordDisplayComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should display masked dots', () => {
		fixture.componentRef.setInput('value', 'secret-password');
		fixture.detectChanges();
		const compiled = fixture.nativeElement as HTMLElement;
		expect(compiled.querySelector('.field-value')?.textContent?.trim()).toBe('••••••••');
	});
});
