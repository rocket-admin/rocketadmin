import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DateEditComponent } from './date.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('DateEditComponent', () => {
  let component: DateEditComponent;
  let fixture: ComponentFixture<DateEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DateEditComponent, BrowserAnimationsModule]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DateEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should prepare date for date input', () => {
    component.value = '2021-06-26T07:22:00.603Z';
    component.ngOnInit();

    expect(component.date).toEqual('2021-06-26');
  });

  it('should remain date undefined if there is no value', () => {
    component.value = null;
    component.ngOnInit();

    expect(component.date).not.toBeDefined();
  });

  it('should send onChange event with new date value', () => {
    component.date = '2021-07-26';
    const event = spyOn(component.onFieldChange, 'emit');
    component.onDateChange();
    expect(event).toHaveBeenCalledWith('2021-07-26');
  });
});
