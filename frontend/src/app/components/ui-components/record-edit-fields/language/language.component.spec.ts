import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LanguageEditComponent } from './language.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';

describe('LanguageEditComponent', () => {
  let component: LanguageEditComponent;
  let fixture: ComponentFixture<LanguageEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        LanguageEditComponent,
        BrowserAnimationsModule
      ],
      providers: [provideHttpClient()]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LanguageEditComponent);
    component = fixture.componentInstance;
    component.widgetStructure = { widget_params: {} } as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load languages on init', () => {
    component.ngOnInit();
    expect(component.languages.length).toBeGreaterThan(0);
  });

  it('should set initial value when value is provided', () => {
    component.value = 'en';
    component.ngOnInit();
    expect(component.selectedLanguageFlag).toBeTruthy();
  });

  it('should parse widget params for show_flag', () => {
    component.widgetStructure = {
      widget_params: { show_flag: false }
    } as any;
    component.ngOnInit();
    expect(component.showFlag).toBe(false);
  });
});
