import { ComponentFixture, TestBed, async } from '@angular/core/testing';

import { TimeIntervalRowComponent } from './time-interval.component';

describe('TimeIntervalRowComponent', () => {
  let component: TimeIntervalRowComponent;
  let fixture: ComponentFixture<TimeIntervalRowComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
    imports: [TimeIntervalRowComponent]
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TimeIntervalRowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
