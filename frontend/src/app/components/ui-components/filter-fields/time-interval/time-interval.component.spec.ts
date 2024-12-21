import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimeIntervalFilterComponent } from './time-interval.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('TimeIntervalFilterComponent', () => {
  let component: TimeIntervalFilterComponent;
  let fixture: ComponentFixture<TimeIntervalFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimeIntervalFilterComponent, BrowserAnimationsModule]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TimeIntervalFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
