import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CodeEditComponent } from './code.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { UiSettingsService } from 'src/app/services/ui-settings.service';
import { provideHttpClient } from '@angular/common/http';

describe('CodeComponent', () => {
  let component: CodeEditComponent;
  let fixture: ComponentFixture<CodeEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CodeEditComponent, BrowserAnimationsModule],
      providers: [provideHttpClient()]
    }).compileComponents();

    fixture = TestBed.createComponent(CodeEditComponent);
    component = fixture.componentInstance;

    component.widgetStructure = {
      widget_params: {
        language: 'css'
      }
    } as any;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
