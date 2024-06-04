import { Component, EventEmitter, Injectable, Input, OnInit, Output } from '@angular/core';

import { BaseRowFieldComponent } from '../base-row-field/base-row-field.component';

@Injectable()

@Component({
  selector: 'app-row-text',
  templateUrl: './text.component.html',
  styleUrls: ['./text.component.css']
})
export class TextRowComponent extends BaseRowFieldComponent {
  @Input() value: string;

  static type = 'text';
}
