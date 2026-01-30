import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { LanguageEditComponent } from './language.component';

describe('LanguageEditComponent', () => {
	let component: LanguageEditComponent;
	let fixture: ComponentFixture<LanguageEditComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [LanguageEditComponent, BrowserAnimationsModule],
			providers: [provideHttpClient()],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(LanguageEditComponent);
		component = fixture.componentInstance;
		fixture.componentRef.setInput('widgetStructure', { widget_params: {} });
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should load languages on init', () => {
		expect(component.languages.length).toBeGreaterThan(0);
	});

	it('should set initial value when value is provided', () => {
		fixture.componentRef.setInput('value', 'en');
		component.ngOnInit();
		expect(component.selectedLanguageFlag()).toBeTruthy();
	});

	it('should parse widget params for show_flag', () => {
		fixture.componentRef.setInput('widgetStructure', {
			widget_params: { show_flag: false },
		});
		fixture.detectChanges();
		expect(component.showFlag()).toBe(false);
	});
});
