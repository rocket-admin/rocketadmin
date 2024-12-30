import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JsonEditorRowComponent } from './json-editor.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('JsonEditorRowComponent', () => {
  let component: JsonEditorRowComponent;
  let fixture: ComponentFixture<JsonEditorRowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JsonEditorRowComponent, BrowserAnimationsModule]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(JsonEditorRowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
