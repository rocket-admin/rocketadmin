import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { WidgetComponent } from './widget.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MockCodeEditorComponent } from 'src/app/testing/code-editor.mock';
import { CodeEditorModule } from '@ngstack/code-editor';

describe('WidgetComponent', () => {
  let component: WidgetComponent;
  let fixture: ComponentFixture<WidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WidgetComponent, BrowserAnimationsModule]
    })
    .overrideComponent(WidgetComponent, {
      remove: { imports: [CodeEditorModule] },
      add: { imports: [MockCodeEditorComponent], schemas: [NO_ERRORS_SCHEMA] }
    })
    .compileComponents();

    fixture = TestBed.createComponent(WidgetComponent);
    component = fixture.componentInstance;

    component.widget = {
      field_name: 'password',
      widget_type: "Password",
      widget_params: "",
      name: "User Password",
      description: ""
    }

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
