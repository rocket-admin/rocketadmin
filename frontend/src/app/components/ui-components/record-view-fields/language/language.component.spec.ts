import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LanguageRecordViewComponent } from './language.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';

describe('LanguageRecordViewComponent', () => {
  let component: LanguageRecordViewComponent;
  let fixture: ComponentFixture<LanguageRecordViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LanguageRecordViewComponent, BrowserAnimationsModule],
      providers: [provideHttpClient()]
    }).compileComponents();

    fixture = TestBed.createComponent(LanguageRecordViewComponent);
    component = fixture.componentInstance;
    component.value = 'en';
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display language name from code', () => {
    component.value = 'en';
    component.ngOnInit();
    expect(component.languageName).toBe('English');
  });

  it('should display em dash when value is empty', () => {
    component.value = null;
    component.ngOnInit();
    expect(component.languageName).toBe('—');
  });
});
