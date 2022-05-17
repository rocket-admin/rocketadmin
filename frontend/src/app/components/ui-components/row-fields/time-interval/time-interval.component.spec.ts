import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TimeIntervalComponent } from './time-interval.component';

describe('TimeIntervalComponent', () => {
  let component: TimeIntervalComponent;
  let fixture: ComponentFixture<TimeIntervalComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TimeIntervalComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TimeIntervalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
