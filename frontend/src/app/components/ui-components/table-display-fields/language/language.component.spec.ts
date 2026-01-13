import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LanguageDisplayComponent } from './language.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';

describe('LanguageDisplayComponent', () => {
  let component: LanguageDisplayComponent;
  let fixture: ComponentFixture<LanguageDisplayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LanguageDisplayComponent, BrowserAnimationsModule],
      providers: [provideHttpClient()]
    }).compileComponents();

    fixture = TestBed.createComponent(LanguageDisplayComponent);
    component = fixture.componentInstance;
    component.value = 'en';
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display language name from code', () => {
    component.value = 'fr';
    component.ngOnInit();
    expect(component.languageName).toBe('French');
  });

  it('should display em dash when value is empty', () => {
    component.value = null;
    component.ngOnInit();
    expect(component.languageName).toBe('—');
  });

  it('should respect show_flag widget parameter', () => {
    component.widgetStructure = {
      widget_params: { show_flag: false }
    } as any;
    component.ngOnInit();
    expect(component.showFlag).toBe(false);
  });
});
