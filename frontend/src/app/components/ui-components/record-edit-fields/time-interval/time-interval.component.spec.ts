import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimeIntervalRowComponent } from './time-interval.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('TimeIntervalRowComponent', () => {
  let component: TimeIntervalRowComponent;
  let fixture: ComponentFixture<TimeIntervalRowComponent>;

  beforeEach(async() => {
    await TestBed.configureTestingModule({
    imports: [TimeIntervalRowComponent, BrowserAnimationsModule]
  }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TimeIntervalRowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
