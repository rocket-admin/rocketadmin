import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CodeRowComponent } from './code.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { UiSettingsService } from 'src/app/services/ui-settings.service';
import { provideHttpClient } from '@angular/common/http';

describe('CodeComponent', () => {
  let component: CodeRowComponent;
  let fixture: ComponentFixture<CodeRowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CodeRowComponent, BrowserAnimationsModule],
      providers: [provideHttpClient()]
    }).compileComponents();

    fixture = TestBed.createComponent(CodeRowComponent);
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
