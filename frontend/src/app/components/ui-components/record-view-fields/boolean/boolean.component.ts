import { Component, Injectable } from '@angular/core';


import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { BaseRecordViewFieldComponent } from '../base-record-view-field/base-record-view-field.component';

@Injectable()
@Component({
  selector: 'app-boolean-record-view',
  templateUrl: './boolean.component.html',
  styleUrls: ['../base-record-view-field/base-record-view-field.component.css', './boolean.component.css'],
  imports: [MatIconModule, CommonModule]
})
export class BooleanRecordViewComponent extends BaseRecordViewFieldComponent {
}
