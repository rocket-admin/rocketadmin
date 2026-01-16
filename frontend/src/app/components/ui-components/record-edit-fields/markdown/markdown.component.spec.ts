import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { MarkdownEditComponent } from './markdown.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { MockCodeEditorComponent } from 'src/app/testing/code-editor.mock';
import { CodeEditorModule } from '@ngstack/code-editor';

describe('MarkdownEditComponent', () => {
  let component: MarkdownEditComponent;
  let fixture: ComponentFixture<MarkdownEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MarkdownEditComponent, BrowserAnimationsModule],
      providers: [provideHttpClient()]
    })
    .overrideComponent(MarkdownEditComponent, {
      remove: { imports: [CodeEditorModule] },
      add: { imports: [MockCodeEditorComponent], schemas: [NO_ERRORS_SCHEMA] }
    })
    .compileComponents();

    fixture = TestBed.createComponent(MarkdownEditComponent);
    component = fixture.componentInstance;

    component.widgetStructure = {
      widget_params: {}
    } as any;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
