import { Component, Injectable } from '@angular/core';
import { BaseRecordViewFieldComponent } from '../base-record-view-field/base-record-view-field.component';

@Injectable()
@Component({
  selector: 'app-uuid-record-view',
  templateUrl: './uuid.component.html',
  styleUrls: ['../base-record-view-field/base-record-view-field.component.css', './uuid.component.css'],
  imports: []
})
export class UuidRecordViewComponent extends BaseRecordViewFieldComponent {
}