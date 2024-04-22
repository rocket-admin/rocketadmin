import { ComponentFixture, TestBed, async } from '@angular/core/testing';

import { TextRowComponent } from './text.component';

describe('TextRowComponent', () => {
  let component: TextRowComponent;
  let fixture: ComponentFixture<TextRowComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TextRowComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TextRowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
