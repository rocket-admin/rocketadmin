import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { JsonEditorEditComponent } from './json-editor.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MockCodeEditorComponent } from 'src/app/testing/code-editor.mock';
import { CodeEditorModule } from '@ngstack/code-editor';

describe('JsonEditorEditComponent', () => {
  let component: JsonEditorEditComponent;
  let fixture: ComponentFixture<JsonEditorEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JsonEditorEditComponent, BrowserAnimationsModule],
    })
    .overrideComponent(JsonEditorEditComponent, {
      remove: { imports: [CodeEditorModule] },
      add: { imports: [MockCodeEditorComponent], schemas: [NO_ERRORS_SCHEMA] }
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(JsonEditorEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
