import { Component, Injectable } from '@angular/core';

import { BaseRecordViewFieldComponent } from '../base-record-view-field/base-record-view-field.component';

@Injectable()
@Component({
  selector: 'app-long-text-record-view',
  templateUrl: './long-text.component.html',
  styleUrls: ['../base-record-view-field/base-record-view-field.component.css', './long-text.component.css'],
  imports: []
})
export class LongTextRecordViewComponent extends BaseRecordViewFieldComponent {

}
