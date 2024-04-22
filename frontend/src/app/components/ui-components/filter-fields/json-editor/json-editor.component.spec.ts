import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JsonEditorFilterComponent } from './json-editor.component';

describe('JsonEditorFilterComponent', () => {
  let component: JsonEditorFilterComponent;
  let fixture: ComponentFixture<JsonEditorFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ JsonEditorFilterComponent ]
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
