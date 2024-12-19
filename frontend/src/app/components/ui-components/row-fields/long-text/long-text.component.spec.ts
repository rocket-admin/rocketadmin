import { ComponentFixture, TestBed, async } from '@angular/core/testing';

import { LongTextRowComponent } from './long-text.component';

describe('LongTextRowComponent', () => {
  let component: LongTextRowComponent;
  let fixture: ComponentFixture<LongTextRowComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
    imports: [LongTextRowComponent]
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LongTextRowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
