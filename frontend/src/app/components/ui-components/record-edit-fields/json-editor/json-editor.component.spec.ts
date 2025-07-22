import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JsonEditorEditComponent } from './json-editor.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('JsonEditorEditComponent', () => {
  let component: JsonEditorEditComponent;
  let fixture: ComponentFixture<JsonEditorEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JsonEditorEditComponent, BrowserAnimationsModule]
    }).compileComponents();
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
