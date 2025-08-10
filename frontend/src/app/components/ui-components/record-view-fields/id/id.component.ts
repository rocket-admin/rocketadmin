import { Component, Injectable } from '@angular/core';

import { BaseRecordViewFieldComponent } from '../base-record-view-field/base-record-view-field.component';

@Injectable()
@Component({
  selector: 'app-id-record-view',
  templateUrl: './id.component.html',
  styleUrls: ['../base-record-view-field/base-record-view-field.component.css', './id.component.css'],
  imports: []
})
export class IdRecordViewComponent extends BaseRecordViewFieldComponent {
}
