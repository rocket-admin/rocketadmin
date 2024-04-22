import { ComponentFixture, TestBed, async } from '@angular/core/testing';

import { DateTimeFilterComponent } from './date-time.component';

describe('DateTimeFilterComponent', () => {
  let component: DateTimeFilterComponent;
  let fixture: ComponentFixture<DateTimeFilterComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DateTimeFilterComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DateTimeFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should prepare date and time for date and time inputs', () => {
    component.value = '2021-06-26T07:22:00.603';
    component.ngOnInit();

    expect(component.date).toEqual('2021-06-26');
    expect(component.time).toEqual('07:22:00');
  });

  it('should send onChange event with new date value', () => {
    component.date = '2021-08-26';
    component.time = '07:22:00';
    const event = spyOn(component.onFieldChange, 'emit');
    component.onDateChange();

    expect(event).toHaveBeenCalledWith('2021-08-26T07:22:00Z');
  });

  it('should send onChange event with new time value', () => {
    component.date = '2021-07-26';
    component.time = '07:20:00';
    const event = spyOn(component.onFieldChange, 'emit');
    component.onTimeChange();

    expect(event).toHaveBeenCalledWith('2021-07-26T07:20:00Z');
  });
});
