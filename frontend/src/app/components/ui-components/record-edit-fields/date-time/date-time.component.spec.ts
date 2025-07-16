import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DBtype } from 'src/app/models/connection';
import { DateTimeRowComponent } from './date-time.component';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';

describe('DateTimeRowComponent', () => {
  let component: DateTimeRowComponent;
  let fixture: ComponentFixture<DateTimeRowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MatSnackBarModule,
        MatDialogModule,
        DateTimeRowComponent,
        BrowserAnimationsModule
      ],
      providers: [provideHttpClient()]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DateTimeRowComponent);
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

  it('should send onChange event with new date value if connectionType is not mysql', () => {
    component.connectionType = DBtype.Postgres;
    component.date = '2021-08-26';
    component.time = '07:22:00';
    const event = spyOn(component.onFieldChange, 'emit');
    component.onDateChange();

    expect(event).toHaveBeenCalledWith('2021-08-26T07:22:00Z');
  });

  it('should send onChange event with new date value if connectionType is mysql', () => {
    component.connectionType = DBtype.MySQL;
    component.date = '2021-08-26';
    component.time = '07:22:00';
    const event = spyOn(component.onFieldChange, 'emit');
    component.onDateChange();

    expect(event).toHaveBeenCalledWith('2021-08-26 07:22:00');
  });

  it('should send onChange event with new time value if connectionType is not mysql', () => {
    component.connectionType = DBtype.Postgres;
    component.date = '2021-07-26';
    component.time = '07:20:00';
    const event = spyOn(component.onFieldChange, 'emit');
    component.onTimeChange();

    expect(event).toHaveBeenCalledWith('2021-07-26T07:20:00Z');
  });

  it('should send onChange event with new time value if connectionType is mysql', () => {
    component.connectionType = DBtype.MySQL;
    component.date = '2021-07-26';
    component.time = '07:20:00';
    const event = spyOn(component.onFieldChange, 'emit');
    component.onTimeChange();

    expect(event).toHaveBeenCalledWith('2021-07-26 07:20:00');
  });
});
