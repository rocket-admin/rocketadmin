import { ComponentFixture, TestBed, async } from '@angular/core/testing';

import { LongTextFilterComponent } from './long-text.component';

describe('LongTextFilterComponent', () => {
  let component: LongTextFilterComponent;
  let fixture: ComponentFixture<LongTextFilterComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
    imports: [LongTextFilterComponent]
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LongTextFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
