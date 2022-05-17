import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { LongTextComponent } from './long-text.component';

describe('LongTextComponent', () => {
  let component: LongTextComponent;
  let fixture: ComponentFixture<LongTextComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ LongTextComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LongTextComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
