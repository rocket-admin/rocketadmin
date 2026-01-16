import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { CodeEditComponent } from './code.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { MockCodeEditorComponent } from 'src/app/testing/code-editor.mock';
import { CodeEditorModule } from '@ngstack/code-editor';

describe('CodeComponent', () => {
  let component: CodeEditComponent;
  let fixture: ComponentFixture<CodeEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CodeEditComponent, BrowserAnimationsModule],
      providers: [provideHttpClient()]
    })
    .overrideComponent(CodeEditComponent, {
      remove: { imports: [CodeEditorModule] },
      add: { imports: [MockCodeEditorComponent], schemas: [NO_ERRORS_SCHEMA] }
    })
    .compileComponents();

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
