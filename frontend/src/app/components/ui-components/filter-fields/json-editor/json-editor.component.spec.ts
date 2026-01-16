import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { JsonEditorFilterComponent } from './json-editor.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MockCodeEditorComponent } from 'src/app/testing/code-editor.mock';
import { CodeEditorModule } from '@ngstack/code-editor';

describe('JsonEditorFilterComponent', () => {
  let component: JsonEditorFilterComponent;
  let fixture: ComponentFixture<JsonEditorFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JsonEditorFilterComponent, BrowserAnimationsModule],
    })
    .overrideComponent(JsonEditorFilterComponent, {
      remove: { imports: [CodeEditorModule] },
      add: { imports: [MockCodeEditorComponent], schemas: [NO_ERRORS_SCHEMA] }
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(JsonEditorFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
