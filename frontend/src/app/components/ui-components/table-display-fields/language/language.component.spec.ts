import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { LanguageDisplayComponent } from './language.component';

describe('LanguageDisplayComponent', () => {
	let component: LanguageDisplayComponent;
	let fixture: ComponentFixture<LanguageDisplayComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [LanguageDisplayComponent, BrowserAnimationsModule],
			providers: [provideHttpClient()],
		}).compileComponents();

		fixture = TestBed.createComponent(LanguageDisplayComponent);
		component = fixture.componentInstance;
		fixture.componentRef.setInput('value', 'en');
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should display language name from code', () => {
		fixture.componentRef.setInput('value', 'fr');
		fixture.detectChanges();
		expect(component.languageName()).toBe('French');
	});

	it('should display em dash when value is empty', () => {
		fixture.componentRef.setInput('value', null);
		fixture.detectChanges();
		expect(component.languageName()).toBe('—');
	});

	it('should respect show_flag widget parameter', () => {
		fixture.componentRef.setInput('widgetStructure', {
			widget_params: { show_flag: false },
		});
		fixture.detectChanges();
		expect(component.showFlag()).toBe(false);
	});
});
