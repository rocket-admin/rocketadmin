import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { LanguageRecordViewComponent } from './language.component';

describe('LanguageRecordViewComponent', () => {
	let component: LanguageRecordViewComponent;
	let fixture: ComponentFixture<LanguageRecordViewComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [LanguageRecordViewComponent, BrowserAnimationsModule],
			providers: [provideHttpClient()],
		}).compileComponents();

		fixture = TestBed.createComponent(LanguageRecordViewComponent);
		component = fixture.componentInstance;
		fixture.componentRef.setInput('value', 'en');
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should display language name from code', () => {
		fixture.componentRef.setInput('value', 'en');
		fixture.detectChanges();
		expect(component.languageName()).toBe('English');
	});

	it('should display em dash when value is empty', () => {
		fixture.componentRef.setInput('value', null);
		fixture.detectChanges();
		expect(component.languageName()).toBe('—');
	});
});
