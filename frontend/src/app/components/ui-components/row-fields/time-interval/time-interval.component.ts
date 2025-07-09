import * as pgInterval from 'postgres-interval';

import { Component, Input } from '@angular/core';

import { BaseRowFieldComponent } from '../base-row-field/base-row-field.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-row-time-interval',
  imports: [CommonModule, MatFormFieldModule, MatInputModule, FormsModule],
  templateUrl: './time-interval.component.html',
  styleUrls: ['./time-interval.component.css']
})
export class TimeIntervalRowComponent extends BaseRowFieldComponent {
  @Input() value;

  public interval = {
    years: '',
    months: '',
    days: '',
    hours: '',
    minutes: '',
    seconds: '',
    milliseconds: ''
  };


  ngOnInit(): void {
    super.ngOnInit();
    // @ts-ignore
    if (this.value) this.interval = this.value;
  }

  onInputChange() {
    // @ts-ignore
    const currentInterval = pgInterval.prototype.toPostgres.call(this.interval);
    this.onFieldChange.emit(currentInterval);
  }
}
